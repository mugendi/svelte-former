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

  //   $: console.log(JSON.stringify(control, 0, 4));
</script>

<div class="label-container">
  <Label bind:control />
  <Error bind:control />
</div>

<textarea {...control.attributes} on:change={onChange} on:keyup={onChange}   />
