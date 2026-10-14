import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useListPage } from './useListPage';

test('selection changes do not trigger query effects; page changes do', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  let list;
  let calls = 0;
  function Probe() {
    list = useListPage();
    React.useEffect(() => { calls++; }, [list.toQueryParams]);
    return null;
  }
  act(() => root.render(<Probe />));
  expect(calls).toBe(1);
  act(() => list.setSelectedKeys(['one']));
  expect(calls).toBe(1);
  act(() => list.setPage(2));
  expect(calls).toBe(2);
  act(() => root.unmount());
});
