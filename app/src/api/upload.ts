/**
 * Adapter between picker results (document / image pickers) and multipart FormData.
 */

import { Platform } from 'react-native';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType?: string | null;
  /** Web pickers expose the underlying File object. */
  file?: Blob;
}

export function appendFile(form: FormData, file: PickedFile, fallbackType: string, field = 'file'): FormData {
  if (Platform.OS === 'web' && file.file) {
    form.append(field, file.file, file.name);
  } else {
    form.append(field, {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || fallbackType,
    } as any);
  }
  return form;
}

export function toFormData(file: PickedFile, fallbackType: string, field = 'file'): FormData {
  return appendFile(new FormData(), file, fallbackType, field);
}

export function appendField(form: FormData, key: string, value: string): FormData {
  form.append(key, value);
  return form;
}
