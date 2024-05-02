<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { onMount } from "svelte";
  import Error from "../Error.svelte";
  import Label from "../Label.svelte";

  export let control;
  export let onChange;
  let textareaEl;
  let editor;
  const event = new Event("change");

  //   remove required to prevent focusable error

  if (control && control.attributes && control.attributes.required) {
    delete control.attributes.required;
  }

  function init() {
    editor = SUNEDITOR.create(textareaEl, {
      //   codeMirror: CodeMirror,
      katex: katex,
      buttonList: [
        // default
        ["undo", "redo"],
        [
          ":p-More Paragraph-default.more_paragraph",
          "font",
          "fontSize",
          "formatBlock",
          "paragraphStyle",
          "blockquote",
        ],
        ["bold", "underline", "italic", "strike", "subscript", "superscript"],
        ["fontColor", "hiliteColor", "textStyle"],
        ["removeFormat"],
        ["outdent", "indent"],
        ["align", "horizontalRule", "list", "lineHeight"],
        [
          "-right",
          ":i-More Misc-default.more_vertical",
          "fullScreen",
          "showBlocks",
          "codeView",
          "preview",
          "print",
          "save",
          "template",
        ],
        ["-right", ":r-More Rich-default.more_plus", "table", "math", "imageGallery"],
        ["-right", "image", "video", "audio", "link"],
        // (min-width: 992)
        [
          "%992",
          [
            ["undo", "redo"],
            [
              ":p-More Paragraph-default.more_paragraph",
              "font",
              "fontSize",
              "formatBlock",
              "paragraphStyle",
              "blockquote",
            ],
            ["bold", "underline", "italic", "strike"],
            [
              ":t-More Text-default.more_text",
              "subscript",
              "superscript",
              "fontColor",
              "hiliteColor",
              "textStyle",
            ],
            ["removeFormat"],
            ["outdent", "indent"],
            ["align", "horizontalRule", "list", "lineHeight"],
            [
              "-right",
              ":i-More Misc-default.more_vertical",
              "fullScreen",
              "showBlocks",
              "codeView",
              "preview",
              "print",
              "save",
              "template",
            ],
            [
              "-right",
              ":r-More Rich-default.more_plus",
              "table",
              "link",
              "image",
              "video",
              "audio",
              "math",
              "imageGallery",
            ],
          ],
        ],
        // (min-width: 767)
        [
          "%767",
          [
            ["undo", "redo"],
            [
              ":p-More Paragraph-default.more_paragraph",
              "font",
              "fontSize",
              "formatBlock",
              "paragraphStyle",
              "blockquote",
            ],
            [
              ":t-More Text-default.more_text",
              "bold",
              "underline",
              "italic",
              "strike",
              "subscript",
              "superscript",
              "fontColor",
              "hiliteColor",
              "textStyle",
            ],
            ["removeFormat"],
            ["outdent", "indent"],
            [
              ":e-More Line-default.more_horizontal",
              "align",
              "horizontalRule",
              "list",
              "lineHeight",
            ],
            [
              ":r-More Rich-default.more_plus",
              "table",
              "link",
              "image",
              "video",
              "audio",
              "math",
              "imageGallery",
            ],
            [
              "-right",
              ":i-More Misc-default.more_vertical",
              "fullScreen",
              "showBlocks",
              "codeView",
              "preview",
              "print",
              "save",
              "template",
            ],
          ],
        ],
        // (min-width: 480)
        [
          "%480",
          [
            ["undo", "redo"],
            [
              ":p-More Paragraph-default.more_paragraph",
              "font",
              "fontSize",
              "formatBlock",
              "paragraphStyle",
              "blockquote",
            ],
            [
              ":t-More Text-default.more_text",
              "bold",
              "underline",
              "italic",
              "strike",
              "subscript",
              "superscript",
              "fontColor",
              "hiliteColor",
              "textStyle",
              "removeFormat",
            ],
            [
              ":e-More Line-default.more_horizontal",
              "outdent",
              "indent",
              "align",
              "horizontalRule",
              "list",
              "lineHeight",
            ],
            [
              ":r-More Rich-default.more_plus",
              "table",
              "link",
              "image",
              "video",
              "audio",
              "math",
              "imageGallery",
            ],
            [
              "-right",
              ":i-More Misc-default.more_vertical",
              "fullScreen",
              "showBlocks",
              "codeView",
              "preview",
              "print",
              "save",
              "template",
            ],
          ],
        ],
      ],
    });

    editor.onChange = function (contents, core) {
      contents = contents.replace("<p><br></p>", "");

      if (!contents) {
        textareaEl.value = null;
      } else {
        textareaEl.value = contents;
      }

      // Dispatch it.
      textareaEl.dispatchEvent(event);
    };
  }

  onMount(async () => {
    while ("SUNEDITOR" in window === false) {
      await delay(100);
    }

    init();
  });

  function delay(time = 1000) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  //   $: console.log(JSON.stringify(control.attributes, 0, 4));
</script>

<div class="label-container">
  <Label bind:control />
  <Error bind:control />
</div>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://cdn.statically.io/gh/JiHong88/suneditor/master/dist/css/suneditor.min.css"
  />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css" />
  <script src="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js"></script>
  <script src="https://cdn.statically.io/gh/JiHong88/suneditor/master/dist/suneditor.min.js"></script>
</svelte:head>

<div bind:this={control.node}>
  <textarea
    bind:this={textareaEl}
    {...control.attributes}
    on:change={onChange}
    on:keyup={onChange}
  />
</div>
