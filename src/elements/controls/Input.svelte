<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  // import { currentControl } from "../../lib/store";
  import Error from "../Error.svelte";
  import Icons from "../Icons.svelte";
  import Label from "../Label.svelte";

  export let control;
  export let onChange;

  let type;
  let optionValue;

  function toggleHidden(e) {
    // console.log(e);
    control.showHidden = !control.showHidden;

    //
  }

  $: {
    type = control.attributes.type;

    // do not have required in hidden fields
    if (type == "hidden") {
      // https://radu.link/fix-invalid-form-control-not-focusable/
      delete control.attributes.required;
    }
  }
</script>

<!-- Radio Boxes -->
{#if type == "radio"}
  <div class="label-container">
    <div>
      <Label bind:control cls="svelte-former-label pad-left" />

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
            cls="svelte-former-label small"
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
{:else if type == "password"}
  <div class="label-container">
    <Label bind:control />
    <Error bind:control />
  </div>
  <input
    {...control.attributes}
    on:change={onChange}
    on:keyup={onChange}
    bind:this={control.node}
    type={control.showHidden ? "text" : "password"}
  />

  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <span
    class="svelte-former-icon"
    title={control.showHidden ? "Hide" : "Show"}
    on:click={toggleHidden}
  >
    <Icons icon={control.showHidden ? "eyeClosed" : "eyeOpen"} />
  </span>
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
