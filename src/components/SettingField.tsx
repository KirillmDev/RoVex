import type { SettingDefinition } from '../registry/types';
import { featureMessage } from '../localization/messages';

type Props = {
  featureId: string;
  id: string;
  setting: SettingDefinition;
  value: unknown;
  commit: (value: unknown) => void;
};

export function SettingField({ featureId, id, setting, value, commit }: Props) {
  return (
    <div className="ct-field">
      <div className="ct-field-copy">
        <label htmlFor={id}>
          {featureMessage(featureId, `setting_${setting.key}_label`, setting.label)}
        </label>
        {setting.description && (
          <small id={`${id}-description`}>
            {featureMessage(featureId, `setting_${setting.key}_description`, setting.description)}
          </small>
        )}
      </div>
      {setting.kind === 'boolean' && (
        <input
          id={id}
          className="ct-switch"
          type="checkbox"
          checked={value === true}
          aria-describedby={setting.description ? `${id}-description` : undefined}
          onChange={(event) => commit(event.target.checked)}
        />
      )}
      {setting.kind === 'number' && (
        <div className={setting.presentation === 'slider' ? 'ct-slider' : undefined}>
          <input
            id={id}
            type={setting.presentation === 'slider' ? 'range' : 'number'}
            value={Number(value)}
            min={setting.min}
            max={setting.max}
            step={setting.step}
            aria-describedby={setting.description ? `${id}-description` : undefined}
            onChange={(event) => commit(event.target.valueAsNumber)}
          />
          {setting.presentation === 'slider' && <output htmlFor={id}>{String(value)}</output>}
        </div>
      )}
      {setting.kind === 'color' && (
        <div className="ct-color">
          <span aria-hidden="true">{String(value)}</span>
          <input
            id={id}
            type="color"
            value={String(value)}
            onChange={(event) => commit(event.target.value)}
          />
        </div>
      )}
      {setting.kind === 'text' && (
        <input
          id={id}
          type="text"
          value={String(value ?? '')}
          maxLength={setting.maxLength}
          placeholder={setting.placeholder}
          aria-describedby={setting.description ? `${id}-description` : undefined}
          onChange={(event) => commit(event.target.value)}
        />
      )}
      {setting.kind === 'select' && (
        <select
          id={id}
          value={String(value)}
          aria-describedby={setting.description ? `${id}-description` : undefined}
          onChange={(event) => commit(event.target.value)}
        >
          {setting.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
