import { useEffect } from 'react';
import { installErrorFocus } from './errorFocus';

export default function AutoFocusError() {
  useEffect(() => installErrorFocus(), []);
  return null;
}
