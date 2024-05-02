<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { merge } from "../lib/merge";
  import { Errors, Values } from "../lib/store";
  export let buttons = [{ text: "Submit" }];
  export let formEl;

  // format buttons
  buttons = buttons.map((o) => {
    o = merge({ attributes: { type: "submit", class: "button" }, text: "Submit" }, o || {});
    return o;
  });

  function onButtonClick(button, e) {
    if (typeof button.onClick == "function") {
      button.onClick.bind()(e, {
        form: formEl,
        errors: $Errors,
        values: $Values,
        controls: controls,
      });
    }
  }

</script>

{#each buttons as button}
  <button {...button.attributes} on:click={onButtonClick.bind(null, button)}
    >{@html button.text}</button
  >
{/each}
