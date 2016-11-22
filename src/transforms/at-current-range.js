
import Normalize from '../utils/normalize'

/**
 * Add a `mark` to the characters in the current selection.
 *
 * @param {Transform} transform
 * @param {Mark} mark
 */

export function addMark(transform, mark) {
  mark = Normalize.mark(mark)
  const { state } = transform
  const { document, selection } = state

  if (selection.isExpanded) {
    transform.addMarkAtRange(selection, mark)
    return
  }

  if (selection.marks) {
    const marks = selection.marks.add(mark)
    const sel = selection.merge({ marks })
    transform.moveTo(sel)
    return
  }

  const marks = document.getMarksAtRange(selection).add(mark)
  const sel = selection.merge({ marks })
  transform.moveTo(sel)
}

/**
 * Delete at the current selection.
 *
 * @param {Transform} transform
 */

export function _delete(transform) {
  const { state } = transform
  const { document, selection } = state

  // If the selection is collapsed, there's nothing to delete.
  if (selection.isCollapsed) return

  const { startText } = state
  const { startKey, startOffset, endKey, endOffset } = selection
  const block = document.getClosestBlock(startKey)
  const highest = block.getHighestChild(startKey)
  const previous = block.getPreviousSibling(highest.key)
  const next = block.getNextSibling(highest.key)
  let after

  // If there's a previous node, and we're at the start of the current node,
  // and the selection encompasses the entire current node, it won't exist after
  // deleting, so we need to update the selection's keys.
  if (
    previous &&
    startOffset == 0 &&
    (endKey != startKey || endOffset == startText.length)
  ) {

    // If the nodes on either sides are text nodes, they will end up being
    // combined, so we need to set the selection to right in between them.
    if (previous.kind == 'text' && next && next.kind == 'text') {
      after = selection.merge({
        anchorKey: previous.key,
        anchorOffset: previous.length,
        focusKey: previous.key,
        focusOffset: previous.length
      })
    }

    // Otherwise, if only the previous node is a text node, it won't be merged,
    // so collapse to the end of it.
    else if (previous.kind == 'text') {
      after = selection.collapseToEndOf(previous)
    }

    // Otherwise, if the previous node isn't a text node, we need to get the
    // last text node inside of it and collapse to the end of that.
    else {
      const last = previous.getLastText()
      after = selection.collapseToEndOf(last)
    }
  }

  // Otherwise, if the inline is an online child

  // Otherwise simply collapse the selection.
  else {
    after = selection.collapseToStart()
  }

  transform
    .unsetSelection()
    .deleteAtRange(selection)
    .moveTo(after)
}

/**
 * Delete backward `n` characters at the current selection.
 *
 * @param {Transform} transform
 * @param {Number} n (optional)
 */

export function deleteBackward(transform, n = 1) {
  const { state } = transform
  const { selection } = state
  transform.deleteBackwardAtRange(selection, n)
}

/**
 * Delete forward `n` characters at the current selection.
 *
 * @param {Transform} transform
 * @param {Number} n (optional)
 */

export function deleteForward(transform, n = 1) {
  const { state } = transform
  const { selection } = state
  transform.deleteForwardAtRange(selection, n)
}

/**
 * Insert a `block` at the current selection.
 *
 * @param {Transform} transform
 * @param {String|Object|Block} block
 */

export function insertBlock(transform, block) {
  block = Normalize.block(block)
  const { state } = transform
  const { selection } = state
  transform.insertBlockAtRange(selection, block)
  transform.collapseToEndOf(block)
}

/**
 * Insert a `fragment` at the current selection.
 *
 * @param {Transform} transform
 * @param {Document} fragment
 */

export function insertFragment(transform, fragment) {
  let { state } = transform
  let { document, selection } = state

  if (!fragment.length) return

  const { startText, endText } = state
  const lastText = fragment.getLastText()
  const lastInline = fragment.getClosestInline(lastText.key)
  const keys = document.getTexts().map(text => text.key)
  const isAppending = (
    selection.hasEdgeAtEndOf(endText) ||
    selection.hasEdgeAtStartOf(startText)
  )

  transform.unsetSelection()
  transform.insertFragmentAtRange(selection, fragment)
  state = transform.state
  document = state.document

  const newTexts = document.getTexts().filter(n => !keys.includes(n.key))
  const newText = isAppending ? newTexts.last() : newTexts.takeLast(2).first()
  let after

  if (newText && lastInline) {
    after = selection.collapseToEndOf(newText)
  }

  else if (newText) {
    after = selection
      .collapseToStartOf(newText)
      .moveForward(lastText.length)
  }

  else {
    after = selection
      .collapseToStart()
      .moveForward(lastText.length)
  }

  transform.moveTo(after)
}

/**
 * Insert a `inline` at the current selection.
 *
 * @param {Transform} transform
 * @param {String|Object|Block} inline
 */

export function insertInline(transform, inline) {
  inline = Normalize.inline(inline)
  const { state } = transform
  const { selection, startBlock } = state
  transform.insertInlineAtRange(selection, inline)

  // If the start block is void, it won't have inserted at all.
  if (startBlock.isVoid) return

  // Otherwise, find the inserted inline node, and collapse to the start of it.
  const { document } = transform.state
  inline = document.assertNode(inline.key)
  transform.collapseToEndOf(inline)
}

/**
 * Insert a `text` string at the current selection.
 *
 * @param {Transform} transform
 * @param {String} text
 * @param {Set<Mark>} marks (optional)
 */

export function insertText(transform, text, marks) {
  const { state } = transform
  const { selection } = state
  marks = marks || selection.marks
  transform.insertTextAtRange(selection, text, marks)
  transform.unsetMarks()
}

/**
 * Set `properties` of the block nodes in the current selection.
 *
 * @param {Transform} transform
 * @param {Object} properties
 */

export function setBlock(transform, properties) {
  const { state } = transform
  const { selection } = state
  transform.setBlockAtRange(selection, properties)
}

/**
 * Set `properties` of the inline nodes in the current selection.
 *
 * @param {Transform} transform
 * @param {Object} properties
 */

export function setInline(transform, properties) {
  const { state } = transform
  const { selection } = state
  transform.setInlineAtRange(selection, properties)
}

/**
 * Split the block node at the current selection, to optional `depth`.
 *
 * @param {Transform} transform
 * @param {Number} depth (optional)
 */

export function splitBlock(transform, depth = 1) {
  let { state } = transform
  let { document, selection } = state

  transform.unsetSelection()
  transform.splitBlockAtRange(selection, depth)

  state = transform.state
  document = state.document

  const { startKey, startOffset } = selection
  const startText = document.getNode(startKey)
  const startBlock = document.getClosestBlock(startKey)
  const startInline = startBlock.getFurthestInline(startKey)
  const nextText = document.getNextText(startText.key)
  let after

  // If the selection is at the start of the highest inline child inside the
  // block, the starting text node won't need to be split.
  if (
    (startOffset == 0) &&
    (startBlock.text != '') &&
    (!startInline || startInline.getOffset(startText.key) == 0)
  ) {
    after = selection.collapseToStartOf(startText)
  }

  // Otherwise, we'll need to move the selection forward one to account for the
  // text node that was split.
  else {
    after = selection.collapseToStartOf(nextText)
  }

  transform.moveTo(after)
}

/**
 * Split the inline nodes at the current selection, to optional `depth`.
 *
 * @param {Transform} transform
 * @param {Number} depth (optional)
 */

export function splitInline(transform, depth = Infinity) {
  let { state } = transform
  let { document, selection } = state

  // If the selection is expanded, remove it first.
  if (selection.isExpanded) {
    transform.delete()
    state = transform.state
    document = state.document
    selection = state.selection
  }

  let after = selection
  const { startKey, startOffset } = selection
  let startNode = document.assertDescendant(startKey)
  const furthestInline = document.getFurthestInline(startKey)
  const offset = furthestInline.getOffset(startNode.key)

  // If the selection is at the start of end of the furthest inline, there isn't
  // anything to split, so abort.
  if (
    (offset + startOffset == 0) ||
    (offset + startNode.length == startOffset)
  ) {
    return
  }

  transform.unsetSelection()
  transform.splitInlineAtRange(selection, depth)
  state = transform.state
  document = state.document
  const closestInline = document.getClosestInline(startKey)

  if (closestInline) {
    startNode = document.getDescendant(startKey)
    const nextNode = document.getNextText(startNode.key)
    after = selection.collapseToStartOf(nextNode)
  }

  transform.moveTo(after)
}

/**
 * Remove a `mark` from the characters in the current selection.
 *
 * @param {Transform} transform
 * @param {Mark} mark
 */

export function removeMark(transform, mark) {
  mark = Normalize.mark(mark)
  const { state } = transform
  const { document, selection } = state

  if (selection.isExpanded) {
    transform.removeMarkAtRange(selection, mark)
    return
  }

  if (selection.marks) {
    const marks = selection.marks.remove(mark)
    const sel = selection.merge({ marks })
    transform.moveTo(sel)
    return
  }

  const marks = document.getMarksAtRange(selection).remove(mark)
  const sel = selection.merge({ marks })
  transform.moveTo(sel)
}

/**
 * Add or remove a `mark` from the characters in the current selection,
 * depending on whether it's already there.
 *
 * @param {Transform} transform
 * @param {Mark} mark
 */

export function toggleMark(transform, mark) {
  mark = Normalize.mark(mark)
  const { state } = transform
  const exists = state.marks.some(m => m.equals(mark))

  if (exists) {
    transform.removeMark(mark)
  } else {
    transform.addMark(mark)
  }
}

/**
 * Unwrap the current selection from a block parent with `properties`.
 *
 * @param {Transform} transform
 * @param {Object|String} properties
 */

export function unwrapBlock(transform, properties) {
  const { state } = transform
  const { selection } = state
  transform.unwrapBlockAtRange(selection, properties)
}

/**
 * Unwrap the current selection from an inline parent with `properties`.
 *
 * @param {Transform} transform
 * @param {Object|String} properties
 */

export function unwrapInline(transform, properties) {
  const { state } = transform
  const { selection } = state
  transform.unwrapInlineAtRange(selection, properties)
}

/**
 * Wrap the block nodes in the current selection with a new block node with
 * `properties`.
 *
 * @param {Transform} transform
 * @param {Object|String} properties
 */

export function wrapBlock(transform, properties) {
  const { state } = transform
  const { selection } = state
  transform.wrapBlockAtRange(selection, properties)
}

/**
 * Wrap the current selection in new inline nodes with `properties`.
 *
 * @param {Transform} transform
 * @param {Object|String} properties
 */

export function wrapInline(transform, properties) {
  let { state } = transform
  let { document, selection } = state
  let after

  const { startKey } = selection
  const previous = document.getPreviousText(startKey)

  transform.unsetSelection()
  transform.wrapInlineAtRange(selection, properties)
  state = transform.state
  document = state.document

  // Determine what the selection should be after wrapping.
  if (selection.isCollapsed) {
    after = selection
  }

  else if (selection.startOffset == 0) {
    const text = previous ? document.getNextText(previous.key) : document.getFirstText()
    after = selection.moveToRangeOf(text)
  }

  else if (selection.startKey == selection.endKey) {
    const text = document.getNextText(selection.startKey)
    after = selection.moveToRangeOf(text)
  }

  else {
    const anchor = document.getNextText(selection.anchorKey)
    const focus = document.getDescendant(selection.focusKey)
    after = selection.merge({
      anchorKey: anchor.key,
      anchorOffset: 0,
      focusKey: focus.key,
      focusOffset: selection.focusOffset
    })
  }

  after = after.normalize(document)
  transform.moveTo(after)
}

/**
 * Wrap the current selection with prefix/suffix.
 *
 * @param {Transform} transform
 * @param {String} prefix
 * @param {String} suffix
 */

export function wrapText(transform, prefix, suffix = prefix) {
  const { state } = transform
  const { selection } = state
  const { anchorOffset, anchorKey, focusOffset, focusKey, isBackward } = selection
  let after

  if (anchorKey == focusKey) {
    after = selection.moveForward(prefix.length)
  }

  else {
    after = selection.merge({
      anchorOffset: isBackward ? anchorOffset : anchorOffset + prefix.length,
      focusOffset: isBackward ? focusOffset + prefix.length : focusOffset
    })
  }

  transform
    .unsetSelection()
    .wrapTextAtRange(selection, prefix, suffix)
    .moveTo(after)
}