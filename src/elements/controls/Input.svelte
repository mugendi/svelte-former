<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { controlError } from "../../lib/utils";
  import { currentField } from "../../lib/store";
  import Label from "../Label.svelte";
  import FieldError from "./FieldError.svelte";
  import { onMount } from "svelte";
  import Icons from "../Icons.svelte";
  export let control;
  // export let values;
  export let validationErrors;
  export let controlContainer;

  // let element;
  let elements = [];

  //   radio boxes must have an array 'value' attribute
  if (control.attributes.type == "radio" && !Array.isArray(control.attributes.value)) {
    controlError(
      control,
      "Radio Inputs must have a 'value' property which must be an array of values."
    );
  }

  function setValue() {
    let element = elements.filter(
      (el) => (control.attributes.type !== "radio" && true) || el.checked
    )[0];

    if (!element) {
      // console.log(elements);
      return;
    }

    currentField.update((o) => elements[0].name);

    if (control.attributes.type == "checkbox") {
      control._value = element.checked;
    } else if (control.attributes.type == "radio") {
      if (element.checked) {
        control._value = element.value;
      }
    } else {
      control._value = element.value;
    }
  }

  if (control.attributes.type == "password") {
    control.isPassword = true;
  }

  function toggleHidden() {
    control.showHidden = "showHidden" in control ? control.showHidden : false;
    control.showHidden = !control.showHidden;

    if (control.showHidden) {
      control.attributes.type = "text";
    } else {
      control.attributes.type = "password";
    }
  }

  // onMount(setValue);

  // console.log(JSON.stringify(values,0,4));
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->

{#if control.attributes.type == "radio"}
  <span class="element inline">
    <span class="label-container">
      <span class="center" bind:this={controlContainer}>
        {#each control.attributes.value as value, i}
          <svelte:element
            this={control.element}
            bind:this={elements[i]}
            {...control.attributes}
            value={value.value || value}
            id={control.attributes.id + "-" + i}
            on:change={setValue}
            checked={value.checked}
          />

          <label class="radio-label" for={control.attributes.id + "-" + i}>
            {value.text || value}
          </label>
        {/each}
      </span>

      <FieldError {control} {validationErrors} />
    </span>
  </span>
{:else if control.attributes.type == "checkbox"}
  <span class="element inline">
    <span class="label-container">
      <span class="center" bind:this={controlContainer}>
        <svelte:element
          this={control.element}
          bind:this={elements[0]}
          {...control.attributes}
          on:change={setValue}
        />
        <Label {control} />
      </span>
      <FieldError {control} {validationErrors} />
    </span>
  </span>
{:else if control.attributes.type == "hidden"}
  <span bind:this={controlContainer}>
    <svelte:element
      this={control.element}
      bind:this={elements[0]}
      {...control.attributes}
      on:keyup={setValue}
      on:change={setValue}
    />
  </span>
{:else}
  <span class="element">
    <span class="label-container">
      <Label {control} />
      <FieldError {control} {validationErrors} />
    </span>

    <span bind:this={controlContainer}>
      <svelte:element
        this={control.element}
        bind:this={elements[0]}
        {...control.attributes}
        on:keyup={setValue}
        on:change={setValue}
      />

      {#if control.isPassword}        ​
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span class="control-icon" title="Show" on:click={toggleHidden}>
          <Icons icon={control.showHidden ? "eyeClosed" : "eyeOpen"} />
        </span>
      {/if}
    </span>
  </span>
{/if}
