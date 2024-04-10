<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  export let classes = [];
  export let value = null;
  export let values = [];
  export let placeholder = "Select Value";
  export let id;
  export let required;

  console.log({ placeholder });
</script>

<select class="{classes.join(' ')} {value==null?"placeholder-val":""}" type="text" {id} {required} bind:value >
  {#if placeholder}
    <option value={null} disabled selected={true}>{placeholder}</option>
  {/if}
  {#each values as option}
    <option value={option.value || option}>{option.text || option}</option>
  {/each}
</select>

<style>
  select.placeholder-val{
    color: #aaa !important;
  }
</style>
