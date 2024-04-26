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

  let type;

  $: {
    type = control.attributes.type;

    // do not have required in hidden fields
    if (type == "hidden") {
      // https://radu.link/fix-invalid-form-control-not-focusable/
      delete control.attributes.required;
    }
  }

  //   $: console.log(JSON.stringify(control, 0, 4));
</script>

<!-- Radio Boxes -->
{#if type == "radio"}
  <div class="label-container">
    <div>
      {#each control.options as option, i}
        <input
          {...control.attributes}
          id={control.attributes.id + "-" + (i + 1)}
          value={option.value || option}
          on:change={onChange}
          on:keyup={onChange}
        />

        <Label
          bind:control
          label={option.text || option}
          id={control.attributes.id + "-" + (i + 1)}
        />
      {/each}
    </div>

    <Error bind:control />
  </div>

  <!-- Check Boxes -->
{:else if type == "checkbox"}
  <div class="label-container">
    <div>
      <input {...control.attributes} on:change={onChange} on:keyup={onChange} />

      <Label bind:control />
    </div>

    <Error bind:control />
  </div>
{:else if type == "hidden"}
  <input {...control.attributes} on:change={onChange} on:keyup={onChange} />
{:else}
  <div class="label-container">
    <Label bind:control />
    <Error bind:control />
  </div>
  <input {...control.attributes} on:change={onChange} on:keyup={onChange} />
{/if}
