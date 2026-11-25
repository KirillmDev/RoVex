import { featureRegistry } from '../registry';
import type { FeatureDefinition, FeatureInstance, FeatureRecord, RouteSnapshot } from '../registry';
import { getRuntimeSettings } from '../storage/chrome-storage';
import { GLOBAL_KEY, featureKey } from '../storage/schema';
import { routeMatches, snapshotRoute } from './routes';
import { siteFromHostname } from '../sites/site';
import { watchDom } from './live-dom';

type ActiveFeature = {
  controller: AbortController;
  instance?: FeatureInstance;
  fingerprint: string;
  generation: number;
};

function featureFingerprint(route: RouteSnapshot, record: FeatureRecord) {
  return JSON.stringify([route.hostname, route.pathname, route.search, record]);
}

export class LifecycleManager {
  private active = new Map<string, ActiveFeature>();
  private reconcileQueued = false;
  private stopped = false;
  private generation = 0;
  private running?: Promise<void>;
  private dirty = false;
  private readonly scope = new AbortController();
  private started = false;
  constructor(
    private readonly getRoute: () => RouteSnapshot = () => snapshotRoute(window.location),
  ) {}

  private readonly handleNavigation = () => this.queueReconcile();
  private readonly handleStorage = (changes: Record<string, chrome.storage.StorageChange>) => {
    if (changes[GLOBAL_KEY] || featureRegistry.some(({ id }) => changes[featureKey(id)]))
      this.queueReconcile();
  };

  async start(): Promise<void> {
    if (this.started || this.stopped) return;
    this.started = true;
    window.addEventListener('creator-toolkit:navigation', this.handleNavigation);
    window.addEventListener('popstate', this.handleNavigation);
    window.addEventListener('hashchange', this.handleNavigation);
    chrome.storage.onChanged.addListener(this.handleStorage);
    watchDom(this.scope.signal, () => {
      if ([...this.active.values()].some((active) => !this.healthy(active))) this.queueReconcile();
    });
    await this.reconcile();
  }

  queueReconcile(): void {
    if (this.reconcileQueued || this.stopped) return;
    this.reconcileQueued = true;
    queueMicrotask(() => {
      this.reconcileQueued = false;
      void this.reconcile().catch((error: unknown) => this.diagnose('reconciliation', error));
    });
  }

  private featureMatches(feature: FeatureDefinition, route: RouteSnapshot): boolean {
    const site = siteFromHostname(route.hostname);
    return (
      site !== null &&
      feature.supportedSites.includes(site) &&
      feature.routes.some((rule) => routeMatches(rule, route))
    );
  }

  private async deactivate(id: string): Promise<void> {
    const active = this.active.get(id);
    if (!active) return;
    this.active.delete(id);
    active.controller.abort();
    try {
      await active.instance?.deactivate?.();
    } catch (error) {
      this.diagnose(id, error);
    } finally {
      document
        .querySelectorAll(`[data-creator-toolkit-owner="${id}"]`)
        .forEach((node) => node.remove());
    }
  }

  private diagnose(stage: string, error: unknown) {
    if (import.meta.env.ROVEX_DEV_DIAGNOSTICS) console.warn(`RoVex runtime: ${stage}`, error);
  }

  private healthy(active: ActiveFeature): boolean {
    try {
      return active.instance?.isHealthy?.() !== false;
    } catch (error) {
      this.diagnose('feature health check', error);
      return false;
    }
  }

  private async activate(feature: FeatureDefinition, route: RouteSnapshot, record: FeatureRecord) {
    if (this.stopped) return;
    const controller = new AbortController();
    const generation = ++this.generation;
    const pending: ActiveFeature = {
      controller,
      fingerprint: featureFingerprint(route, record),
      generation,
    };
    this.active.set(feature.id, pending);
    try {
      const instance = await feature.activate({
        signal: controller.signal,
        route,
        record,
        ownerSelector: `[data-creator-toolkit-owner="${feature.id}"]`,
      });
      if (controller.signal.aborted || this.active.get(feature.id)?.generation !== generation) {
        await instance?.deactivate?.();
        return;
      }
      pending.instance = instance ?? undefined;
    } catch (error) {
      await this.deactivate(feature.id);
      this.diagnose(feature.id, error);
    }
  }

  reconcile(): Promise<void> {
    this.dirty = true;
    this.running ??= Promise.resolve()
      .then(async () => {
        while (this.dirty && !this.stopped) {
          this.dirty = false;
          await this.reconcileOnce();
        }
      })
      .finally(() => {
        this.running = undefined;
        if (this.dirty && !this.stopped) return this.reconcile();
      });
    return this.running;
  }

  private async reconcileOnce(): Promise<void> {
    if (this.stopped) return;
    const route = this.getRoute();
    const candidates = featureRegistry.filter(
      (feature) => feature.status !== 'disabled' && this.featureMatches(feature, route),
    );
    const { enabled, records } = await getRuntimeSettings(candidates);
    if (this.stopped) return;
    const latest = this.getRoute();
    if (
      route.hostname !== latest.hostname ||
      route.pathname !== latest.pathname ||
      route.search !== latest.search ||
      route.hash !== latest.hash
    ) {
      this.dirty = true;
      return;
    }
    const desired = new Map<string, { feature: FeatureDefinition; record: FeatureRecord }>();
    if (enabled) {
      for (const feature of candidates) {
        const record = records.get(feature.id)!;
        if (record.enabled) desired.set(feature.id, { feature, record });
      }
    }

    for (const [id, active] of [...this.active]) {
      const target = desired.get(id);
      if (
        !target ||
        active.fingerprint !== featureFingerprint(route, target.record) ||
        !this.healthy(active)
      ) {
        await this.deactivate(id);
      }
    }

    for (const { feature, record } of desired.values()) {
      if (this.stopped) return;
      if (!this.active.has(feature.id)) await this.activate(feature, route, record);
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    window.removeEventListener('creator-toolkit:navigation', this.handleNavigation);
    window.removeEventListener('popstate', this.handleNavigation);
    window.removeEventListener('hashchange', this.handleNavigation);
    chrome.storage.onChanged.removeListener(this.handleStorage);
    this.scope.abort();
    await Promise.all([...this.active.keys()].map((id) => this.deactivate(id)));
  }

  isActive(id: string): boolean {
    return this.active.has(id);
  }
}
