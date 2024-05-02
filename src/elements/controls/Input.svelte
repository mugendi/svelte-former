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
  let optionValue;

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
      <Label bind:control cls="label pad-left"/>

      <div class="radio-control" bind:this={control.node}>
        {#each control.options as option, i}
          {(optionValue = option.value || option) && ""}

          <input
            {...control.attributes}
            id={control.attributes.id + "-" + (i + 1)}
            value={optionValue}
            checked={optionValue == control.attributes.value}
            on:change={onChange}
            on:keyup={onChange}
          />

          <Label
            bind:control
            label={option.text || option}
            id={control.attributes.id + "-" + (i + 1)}
            cls="label small"
          />
        {/each}
      </div>
    </div>
    <Error bind:control />
  </div>

  <!-- Check Boxes -->
{:else if type == "checkbox"}
  <div class="label-container">
    <div class="checkbox-control">
      <input
        {...control.attributes}
        on:change={onChange}
        on:keyup={onChange}
        bind:this={control.node}
      />

      <Label bind:control />
    </div>

    <Error bind:control />
  </div>
{:else if type == "hidden"}
  <input
    {...control.attributes}
    on:change={onChange}
    on:keyup={onChange}
    bind:this={control.node}
  />
{:else}
  <div class="label-container">
    <Label bind:control />
    <Error bind:control />
  </div>
  <input
    {...control.attributes}
    on:change={onChange}
    on:keyup={onChange}
    bind:this={control.node}
  />
{/if}
