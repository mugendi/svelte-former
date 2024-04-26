<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import "./styles/bootstrap-grid.scss";
  import "./styles/form.scss";

  import Control from "./elements/Control.svelte";
  import { validateControls } from "./lib/validation.js";
  import { Errors, Values } from "./lib/store";
  import { onMount } from "svelte";

  export let controls = [];
  export let method = "POST";
  export let action = "";
  export let failOnError = true;

  let isReady = false;

  $: {
    let errors = {};
    let values = {};

    for (let i in controls) {
      if ("error" in controls[i] && controls[i].error) {
        errors[controls[i].attributes.name] = controls[i].error;
      }
      if (controls[i].attributes && "value" in controls[i].attributes) {
        // use booleans for checkboxes
        if (controls[i].attributes.type == "checkbox") {
          controls[i].attributes.value = controls[i].attributes.value == "true" ? true : false;
        }
        values[controls[i].attributes.name] = controls[i].attributes.value;
      }
    }

    Errors.update((o) => errors);
    Values.update((o) => values);
    // console.log(JSON.stringify(errors, 0, 4));
  }

  $: {
    console.log($Errors);
    console.log($Values);
  }

  function submitForm(e) {
    if (failOnError && hasErrors()) {
      e.preventDefault();
    }
  }

  function hasErrors() {
    return Object.keys($Errors).length > 0;
  }

  onMount(function () {
    validateControls(controls);
    isReady = true;
  });
</script>

{#if isReady}
  <div class="former">
    <form class="container-fluid" on:submit={submitForm} {action} {method}>
      <div class="row">
        {#each controls as control, i}
          <Control bind:control idx={i + 1} />
        {/each}

        <button class="button">Submit</button>
      </div>
    </form>
  </div>
{/if}
