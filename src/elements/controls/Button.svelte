<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { onMount } from "svelte";
  export let button;
  export let element;

  onMount(() => {
    // console.log(element);
    for (let k in button.css) {
      element.style[k] = button.css[k];
    }
  });
</script>

<!-- {JSON.stringify(button)} -->
<button {...button.attributes} bind:this={element}>
  {button.text || button}
</button>
