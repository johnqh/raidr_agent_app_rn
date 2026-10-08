/**
 * One field of the prepared form, rendered with `@sudobility/components-rn`
 * primitives by its {@link FormField.type}:
 *
 * - `text` / `number` / `datetime`: `Input` (number with a numeric keyboard,
 *   datetime with an ISO `YYYY-MM-DDTHH:mm` placeholder — there is no
 *   date-time picker in the kit and no native picker is installed);
 * - `date`: `DateInput` (the kit's JS calendar), given a local `Date` so the
 *   day does not shift by the UTC offset; optional dates can be cleared;
 * - `select`: `Select`;
 * - `multiselect`: a `Checkbox` per option (a comma-separated `Input` when the
 *   model gave no options);
 * - `boolean`: `Switch`.
 *
 * Validation lives in `@/lib/prepare`; this only shows the error it reports.
 */

import React from 'react';
import { View } from 'react-native';
import {
  Text,
  Input,
  Select,
  Checkbox,
  Switch,
  DateInput,
  Button,
} from '@sudobility/components-rn';
import { useTranslation } from 'react-i18next';
import type { FormField } from '@sudobility/raidr_agent_types';
import { isIsoDate, type DraftValue, type FieldError } from '@/lib/prepare';

interface PreparedFormFieldProps {
  field: FormField;
  value: DraftValue | undefined;
  onChange: (value: DraftValue) => void;
  /** Shown once the user has tried to run or edited the field. */
  error?: FieldError;
}

/** `YYYY-MM-DD` as a local-midnight `Date` (`new Date(text)` would be UTC). */
function localDate(text: string): Date | '' {
  if (!isIsoDate(text)) {
    return '';
  }
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export default function PreparedFormField({
  field,
  value,
  onChange,
  error,
}: PreparedFormFieldProps) {
  const { t } = useTranslation();
  const text = typeof value === 'string' ? value : '';
  const list = Array.isArray(value) ? value : [];
  const testID = `field-${field.name}`;

  const renderControl = () => {
    switch (field.type) {
      case 'boolean':
        return (
          <View className='flex-row items-center justify-between'>
            <Text size='base' className='flex-1 mr-3'>
              {field.label}
            </Text>
            <Switch
              checked={value === true}
              onCheckedChange={onChange}
              accessibilityLabel={field.label}
              testID={testID}
            />
          </View>
        );
      case 'select':
        return (
          <Select
            value={text || undefined}
            onValueChange={onChange}
            options={(field.options ?? []).map(o => ({
              value: o.value,
              label: o.label,
            }))}
            placeholder={t('prepare.choose')}
            title={field.label}
            accessibilityLabel={field.label}
          />
        );
      case 'multiselect':
        if (field.options && field.options.length > 0) {
          return (
            <View>
              {field.options.map(option => {
                const checked = list.includes(option.value);
                return (
                  <Checkbox
                    key={option.value}
                    className='mb-2'
                    label={option.label}
                    checked={checked}
                    onChange={on =>
                      onChange(
                        on
                          ? [...list, option.value]
                          : list.filter(v => v !== option.value)
                      )
                    }
                    accessibilityLabel={option.label}
                  />
                );
              })}
            </View>
          );
        }
        return (
          <Input
            value={list.join(', ')}
            onChangeText={next =>
              onChange(
                next
                  .split(',')
                  .map(v => v.trim())
                  .filter(Boolean)
              )
            }
            placeholder={t('prepare.listPlaceholder')}
            error={!!error}
            accessibilityLabel={field.label}
            testID={testID}
          />
        );
      case 'date':
        return (
          <View className='flex-row items-center'>
            <View className='flex-1'>
              <DateInput
                value={localDate(text)}
                onChange={onChange}
                placeholder={t('prepare.datePlaceholder')}
              />
            </View>
            {!field.required && text ? (
              <Button
                variant='ghost'
                size='sm'
                className='ml-2'
                onPress={() => onChange('')}
                accessibilityLabel={t('prepare.clear')}
              >
                {t('prepare.clear')}
              </Button>
            ) : null}
          </View>
        );
      case 'datetime':
        return (
          <Input
            value={text}
            onChangeText={onChange}
            placeholder={t('prepare.dateTimePlaceholder')}
            autoCapitalize='characters'
            autoCorrect={false}
            error={!!error}
            accessibilityLabel={field.label}
            testID={testID}
          />
        );
      case 'number':
        return (
          <Input
            value={text}
            onChangeText={onChange}
            keyboardType='numeric'
            error={!!error}
            accessibilityLabel={field.label}
            testID={testID}
          />
        );
      default:
        return (
          <Input
            value={text}
            onChangeText={onChange}
            error={!!error}
            accessibilityLabel={field.label}
            testID={testID}
          />
        );
    }
  };

  return (
    <View className='mb-4'>
      {field.type !== 'boolean' ? (
        <Text size='sm' weight='semibold' className='mb-1'>
          {field.label}
          {field.required ? ' *' : ''}
        </Text>
      ) : null}
      {field.description ? (
        <Text size='xs' color='muted' className='mb-1'>
          {field.description}
        </Text>
      ) : null}
      {renderControl()}
      {error ? (
        <Text size='xs' color='danger' className='mt-1'>
          {t(`prepare.errors.${error}`)}
        </Text>
      ) : null}
    </View>
  );
}
