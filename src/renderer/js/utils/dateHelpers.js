/**
 * Date Helper Functions
 */

export function setQuickDate(inputId, type) {
  const input = document.getElementById(inputId);
  if (!input) return;

  const today = new Date();
  let date;

  switch(type) {
    case 'today':
      date = today;
      break;
    case 'month-end':
      date = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'year-end':
      date = new Date(today.getFullYear(), 11, 31);
      break;
    default:
      date = today;
  }

  input.value = date.toISOString().split('T')[0];
}

export function setQuickDateRange(startId, endId, type) {
  const startInput = document.getElementById(startId);
  const endInput = document.getElementById(endId);
  if (!startInput || !endInput) return;

  const today = new Date();
  let start, end;

  switch(type) {
    case 'this-month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'last-month':
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
    case 'this-year':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    default:
      start = today;
      end = today;
  }

  startInput.value = start.toISOString().split('T')[0];
  endInput.value = end.toISOString().split('T')[0];
}
