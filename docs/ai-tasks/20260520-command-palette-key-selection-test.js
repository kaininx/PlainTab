const assert = require('assert');
const fs = require('fs');

const palette = fs.readFileSync('js/command-palette.js', 'utf8');

assert.ok(
  palette.includes('var cpHasKeyboardSelection = false;'),
  'command palette should track whether keyboard selection has started'
);

const resetStart = palette.indexOf('function resetSelection(index)');
const resetEnd = palette.indexOf('function highlightItems', resetStart);
assert.ok(resetStart >= 0 && resetEnd > resetStart, 'resetSelection should be inspectable');
const resetBody = palette.slice(resetStart, resetEnd);
assert.ok(
  resetBody.includes('cpHasKeyboardSelection = false;'),
  'plain renders should clear keyboard selection'
);
assert.ok(
  resetBody.includes("if (typeof index !== 'number')"),
  'plain renders should not highlight the first item by default'
);

const moveStart = palette.indexOf('function moveSelection(key)');
const moveEnd = palette.indexOf('function pageByDelta', moveStart);
assert.ok(moveStart >= 0 && moveEnd > moveStart, 'moveSelection should be inspectable');
const moveBody = palette.slice(moveStart, moveEnd);
assert.ok(
  moveBody.includes('!cpHasKeyboardSelection'),
  'first arrow key should start keyboard selection'
);
assert.ok(
  moveBody.includes("key === 'ArrowUp' || key === 'ArrowLeft'"),
  'first up/left arrow should choose from the end of the current result set'
);
assert.ok(
  moveBody.includes('highlightItems(-1, cpKeyIndex, items)'),
  'first arrow key should add the visual key-hover state'
);

const activateStart = palette.indexOf('function activateSelectedItem()');
const activateEnd = palette.indexOf('// ================================================================', activateStart);
assert.ok(activateStart >= 0 && activateEnd > activateStart, 'activateSelectedItem should be inspectable');
const activateBody = palette.slice(activateStart, activateEnd);
assert.ok(
  activateBody.includes('if (!cpHasKeyboardSelection) return;'),
  'Enter should not activate the first item before keyboard selection starts'
);

console.log('command palette keyboard selection behavior ok');
