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
  export let values = [];
  export let id;
  export let required;
</script>

<select class=" {classes.join(' ')}" type="text" {id} {placeholder} {required} bind:value>
  {#each values as option}
    <option value={option.value || option}>{option.text || option}</option>
  {/each}
</select>

<style>
  .selectc:not(.is-multiple) {
    height: 2.5em;
  }
  .selectc {
    display: inline-block;
    max-width: 100%;
    position: relative;
    vertical-align: top;
  }
  .selectc select {
    padding-right: 2.5em;
    cursor: pointer;
    display: block;
    font-size: 1em;
    max-width: 100%;
    outline: none;
  }
</style>
