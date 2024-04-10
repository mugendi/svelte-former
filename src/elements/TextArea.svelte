<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  export let type = "text";
  export let classes = [""];
  export let placeholder = "Text input";
  export let value = null;
  export let id;
  export let required;


</script>


<textarea class="{classes.join(' ')}" type="text" {id} {placeholder} {required} bind:value />
