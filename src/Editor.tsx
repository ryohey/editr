import React, { Component, ReactNode } from "react"

interface IRect {
  left: number
  top: number
  width: number
  height: number
}

const RectZero = {
  left: 0,
  top: 0,
  width: 0,
  height: 0
}

const rectEqual = (rectA: IRect, rectB: IRect): boolean => {
  return (
    rectA.left === rectB.left &&
    rectA.top === rectB.top &&
    rectA.width === rectB.width &&
    rectA.height === rectB.height
  )
}

interface State {
  content: string
  inputText: string
  cursorIndex: number
  cursorRect: IRect
  contentElement: HTMLElement | null
  textareaElement: HTMLTextAreaElement | null

  // 変換中か
  composition: boolean
}

function getChildIndex(
  elem: HTMLElement,
  filter: (elem: Element) => boolean
): number {
  const parent = elem.parentElement
  if (parent === null) {
    return -1
  }
  return Array.from(parent.children)
    .filter(e => !filter(e))
    .indexOf(elem)
}

function inserted<T>(array: T[], elem: T, toIndex: number) {
  return [...array.slice(0, toIndex), elem, ...array.slice(toIndex)]
}

function isCursor(elem: Element): boolean {
  return (elem as HTMLElement).style.pointerEvents === "none"
}

function removeCharacterAtIndex(str: string, index: number): string {
  return str.substr(0, index) + str.substr(index + 1)
}

// DOMツリーの末端をたどる. callback の戻り値が true なら break
function walkTreeTermination(
  elem: Element,
  callback: (elem: Element) => boolean
): boolean {
  if (elem.children.length === 0) {
    return callback(elem)
  } else {
    for (const n of Array.from(elem.children)) {
      if (walkTreeTermination(n, callback)) {
        return true
      }
    }
  }
  return false
}

function terminalElements(rootElement: Element): Element[] {
  const elements: Element[] = []
  walkTreeTermination(rootElement, elem => {
    elements.push(elem)
    return false
  })
  return elements
}

function mapContentToComponent(content: string): ReactNode {
  if (content === "\n") {
    return <br />
  }
  return (
    <span
      style={{
        whiteSpace: "pre"
      }}
    >
      {content}
    </span>
  )
}

const cursorRectForIndex = (index: number, inElement: Element): IRect => {
  const elems = terminalElements(inElement)
  if (elems === null) {
    return RectZero
  }

  // 横幅は使われない
  const width = -1

  if (elems.length === 0) {
    return {
      left: 0,
      top: 0,
      width,
      height: 20 // TODO: 一行分の大きさを計算する
    }
  }

  if (index === elems.length) {
    const elem = elems[elems.length - 1]
    const rect = elem.getBoundingClientRect()
    return {
      left: rect.left + rect.width,
      top: rect.top,
      width,
      height: rect.height
    }
  }

  const elem = elems[index]
  if (elem === undefined) {
    throw new Error(`cursorIndex が不正: ${index}/${elems.length}`)
  }
  const rect = elem.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width,
    height: rect.height
  }
}

const removeCharacterAtCursor = (state: State): State => {
  const index = state.cursorIndex - 1
  const content = removeCharacterAtIndex(state.content, index)
  return {
    ...state,
    content,
    cursorIndex: Math.max(0, index)
  }
}

const moveCursorDelta = (delta: number) => (state: State): State => {
  if (state.contentElement === null) {
    return state
  }
  const elems = terminalElements(state.contentElement)
  const maxIndex = elems !== null ? elems.length : 0
  const index = state.cursorIndex + delta
  return {
    ...state,
    cursorIndex: Math.min(maxIndex, Math.max(0, index))
  }
}

// 現在のカーソル位置にテキストエリアに入力した文字列を挿入する
const fixTextarea = (state: State): State => {
  if (state.textareaElement === null) {
    return state
  }
  const text = state.textareaElement.value
  return {
    ...state,
    composition: false,
    inputText: "",
    cursorIndex: state.cursorIndex + text.length,
    content: inserted(state.content.split(""), text, state.cursorIndex).join("")
  }
}

const moveCursorWithClick = (e: React.MouseEvent<HTMLDivElement>) => {
  // target はすぐ解放されるのでキャプチャしておく
  const target = e.target as HTMLElement
  return (state: State): State => {
    if (state.textareaElement === null) {
      return state
    }
    state.textareaElement.focus()
    const bounds = target.getBoundingClientRect()
    const isRight = e.clientX - bounds.left > bounds.width / 2
    const cursorIndex = getChildIndex(target, isCursor) + (isRight ? 1 : 0)
    return {
      ...state,
      inputText: "",
      cursorIndex
    }
  }
}

// 実際に文字を描画している要素が生成されたときにその要素を設定し、カーソル位置の計算を行う
const updateContentElement = (c: HTMLElement | null) => (
  state: State
): State | null => {
  if (c === null) {
    return null
  }
  const cursorRect = cursorRectForIndex(state.cursorIndex, c)
  const nextState: Partial<State> = {}

  if (!rectEqual(cursorRect, state.cursorRect)) {
    nextState.cursorRect = cursorRect
  }
  if (c !== state.contentElement) {
    nextState.contentElement = c
  }
  if (Object.keys(nextState).length === 0) {
    return null
  }
  return {
    ...state,
    ...nextState
  }
}

export class Editor extends Component<{}, State> {
  public state: State = {
    content: "Hello, world",
    inputText: "",
    cursorIndex: 0,
    cursorRect: RectZero,
    contentElement: null,
    textareaElement: null,
    composition: false
  }

  private onChangeTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.currentTarget.value

    if (this.state.composition) {
      // 変換中は確定しない
      this.setState({
        inputText: text
      })
    } else {
      this.setState(fixTextarea)
    }
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log("keydown", e.key)
    switch (e.key) {
      case "Backspace":
        this.setState(removeCharacterAtCursor)
        break
      case "ArrowLeft":
        this.setState(moveCursorDelta(-1))
        break
      case "ArrowRight": {
        this.setState(moveCursorDelta(+1))
        break
      }
    }
  }

  private onCompositionEnd = () => {
    if (this.state.composition) {
      this.setState(fixTextarea)
    }
  }

  private onClickContent = (e: React.MouseEvent<HTMLDivElement>) => {
    this.setState(moveCursorWithClick(e))
  }

  render() {
    const { cursorRect } = this.state

    return (
      <div>
        <textarea
          ref={c => {
            if (c !== null && c !== this.state.textareaElement) {
              this.setState({
                textareaElement: c
              })
            }
          }}
          value={this.state.inputText}
          style={{
            position: "absolute",
            left: cursorRect.left,
            top: cursorRect.top,
            zIndex: 999,
            border: "1px solid red",
            opacity: 0.2,
            pointerEvents: "none"
          }}
          onKeyDown={this.onKeyDown}
          onChange={this.onChangeTextarea}
          onCompositionEnd={this.onCompositionEnd}
          onCompositionStart={e => {
            this.setState({
              composition: true
            })
            console.log("oncompositionstart", e.data)
          }}
          onCompositionUpdate={e => console.log("oncompositionupdate", e.data)}
        />
        <div
          style={{
            position: "absolute",
            left: cursorRect.left,
            top: cursorRect.top,
            width: "3px",
            height: cursorRect.height,
            background: "red",
            pointerEvents: "none"
          }}
        />
        <div
          ref={c => this.setState(updateContentElement(c))}
          onClick={this.onClickContent}
        >
          <b>
            {inserted(
              this.state.content.split("").map(mapContentToComponent),
              <span style={{ pointerEvents: "none" }}>
                {this.state.inputText.split("").map(t => (
                  <span>{t}</span>
                ))}
              </span>,
              this.state.cursorIndex
            )}
          </b>
        </div>
        <div>
          <pre>{this.state.content}</pre>
        </div>
        <div>cursorIndex: {this.state.cursorIndex}</div>
      </div>
    )
  }
}
