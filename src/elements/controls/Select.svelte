<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import Error from "../Error.svelte";
  import Label from "../Label.svelte";

  export let control;
  export let onChange;

  $: if (control && control.attributes) {
    control.attributes.value = control.attributes.value || null;
    control.attributes.placeholder = control.attributes.placeholder || "Select Value";
  }

  //   $: console.log(JSON.stringify(control, 0, 4));
</script>

<div class="label-container">
  <Label bind:control />
  <Error bind:control />
</div>

<select
  {...control.attributes}
  on:change={onChange}
  placeholder={control.attributes.value ? null : control.attributes.placeholder}
>
  {#if control.attributes.placeholder}
    <option value={null} selected disabled>{control.attributes.placeholder}</option>
  {/if}
  {#each control.options as option}
    <option value={String(option.value || option)}>{option.text || option}</option>
  {/each}
</select>
