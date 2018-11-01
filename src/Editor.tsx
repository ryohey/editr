import React, { Component } from "react"

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

interface State {
  content: string
  inputText: string
  cursorIndex: number
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

export class Editor extends Component<{}, State> {
  public state: State = {
    content: "Hello, world",
    inputText: "",
    cursorIndex: 0
  }

  private textareaElement: HTMLTextAreaElement | null = null
  private contentElement: HTMLElement | null = null

  // 変換中か
  private composition = false

  private onChangeTextarea(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.currentTarget.value

    if (this.composition) {
      // 変換中は確定しない
      this.setState({
        inputText: text
      })
    } else {
      this.fixTextarea()
    }
  }

  private onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    console.log("keydown", e.key)
    if (e.key === "Backspace") {
      this.setState({
        content: removeCharacterAtIndex(
          this.state.content,
          this.state.cursorIndex - 1
        ),
        cursorIndex: this.state.cursorIndex - 1
      })
    }
  }

  // 現在のカーソル位置にテキストエリアに入力した文字列を挿入する
  private fixTextarea = () => {
    if (this.textareaElement === null) {
      return
    }
    const text = this.textareaElement.value
    this.setState({
      inputText: "",
      cursorIndex: this.state.cursorIndex + text.length,
      content: inserted(
        this.state.content.split(""),
        text,
        this.state.cursorIndex
      ).join("")
    })
  }

  private onCompositionEnd = (
    e: React.CompositionEvent<HTMLTextAreaElement>
  ) => {
    if (this.composition) {
      this.fixTextarea()
    }
    this.composition = false
    console.log("oncompositionend", e.data)
  }

  private cursorRectForIndex = (index: number): IRect => {
    if (this.contentElement === null) {
      return RectZero
    }
    const elems = terminalElements(this.contentElement).filter(
      e => !isCursor(e)
    )
    const width = 10

    if (index === 0) {
      const elem = elems[0]
      const rect = elem.getBoundingClientRect()
      return {
        left: rect.left,
        top: rect.top,
        width,
        height: rect.height
      }
    }

    const elem = elems[index - 1]
    if (elem === null) {
      throw new Error(`cursorIndex が不正: ${index}/${elems.length}`)
    }
    const rect = elem.getBoundingClientRect()
    return {
      left: rect.left + rect.width,
      top: rect.top,
      width,
      height: rect.height
    }
  }

  render() {
    const cursorRect = this.cursorRectForIndex(this.state.cursorIndex)

    return (
      <div>
        <textarea
          ref={c => (this.textareaElement = c)}
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
          onKeyUp={e => console.log("keyup", e.key)}
          onKeyPress={e => console.log("keypress", e.key)}
          onInput={e => {
            console.log("oninput", e)
          }}
          onChange={e => {
            console.log("onchange", e.currentTarget.value)
            this.onChangeTextarea(e)
          }}
          onCompositionEnd={this.onCompositionEnd}
          onCompositionStart={e => {
            this.composition = true
            console.log("oncompositionstart", e.data)
          }}
          onCompositionUpdate={e => console.log("oncompositionupdate", e.data)}
        />
        <div
          onClick={e => {
            if (this.textareaElement === null) {
              return
            }
            this.textareaElement.focus()
            const bounds = (e.target as HTMLElement).getBoundingClientRect()
            const isRight = e.clientX - bounds.left > bounds.width / 2
            const cursorIndex =
              getChildIndex(e.target as HTMLElement, isCursor) +
              (isRight ? 1 : 0)
            this.setState({
              inputText: "",
              cursorIndex
            })
          }}
          onSelect={e => console.log("onselect", e)}
        >
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
          <div ref={c => (this.contentElement = c)}>
            <b>
              {inserted(
                this.state.content.split("").map(c => <span>{c}</span>),
                <span style={{ pointerEvents: "none" }}>
                  {this.state.inputText}
                </span>,
                this.state.cursorIndex
              )}
            </b>
          </div>
        </div>
        <div>cursorIndex: {this.state.cursorIndex}</div>
      </div>
    )
  }
}
