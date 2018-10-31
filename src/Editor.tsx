import React, { Component } from "react"

interface IPoint {
  x: number
  y: number
}

interface ISize {
  width: number
  height: number
}

type IRect = IPoint & ISize

interface State {
  content: string
  inputText: string
  cursorIndex: number
}

function getChildIndex(
  node: HTMLElement,
  filter: (elem: Element) => boolean
): number {
  const parent = node.parentElement
  if (parent === null) {
    return -1
  }
  return Array.from(parent.children)
    .filter(e => !filter(e))
    .indexOf(node)
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

// DOMツリーの末端をたどる
function walkTreeTermination(node: Node, callback: (node: Node) => boolean) {
  if (node.childNodes.length === 0) {
    callback(node)
  } else {
    Array.from(node.childNodes).forEach(n => walkTreeTermination(n ,callback))
  }
}

export class Editor extends Component<{}, State> {
  public state: State = {
    content: "Hello, world",
    inputText: "",
    cursorIndex: 0
  }

  private textarea: HTMLTextAreaElement | null = null
  private content: HTMLElement | null = null

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
    if (this.textarea === null) {
      return
    }
    const text = this.textarea.value
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
    const elem = this.elementForCursorIndex(index)
    if (elem === null) {
      return { x: 0, y: 0, width: 0, height: 0 }
    }
    const rect = elem.getBoundingClientRect()
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    }
  }

  private elementForCursorIndex = (index: number): HTMLElement|null => {
    if (this.textarea === null || this.content === null) {
      return null
    }
    // DOMツリーの末端の要素を文字としてたどっていく
    this.content.children
    const charChildren = Array.from(this.content.children).filter(
      e => 
    )
    let i = 0
    walkTreeTermination(this.content, node => {
      if (!isCursor(node as HTMLElement)) {
        i++
      }
      i === index
    })
    let i = Math.min(charChildren.length - 1, Math.max(0, index))
    const elem = charChildren[i]
    return elem
  }

  render() {
    const cursorRect = this.cursorRectForIndex(this.state.cursorIndex)

    return (
      <div>
        <textarea
          ref={c => (this.textarea = c)}
          value={this.state.inputText}
          style={{
            position: "absolute",
            left: cursorRect.x,
            top: cursorRect.y,
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
          ref={c => (this.content = c)}
          onClick={e => {
            if (this.textarea === null) {
              return
            }
            this.textarea.focus()
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
              left: cursorRect.x,
              top: cursorRect.y,
              width: "3px",
              height: cursorRect.height,
              background: "red",
              pointerEvents: "none"
            }}
          />

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
        <div>cursorIndex: {this.state.cursorIndex}</div>
      </div>
    )
  }
}
