<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import "./styles/bootstrap-grid.scss";
  import "./styles/form.scss";

  import Control from "./elements/Control.svelte";
  import { validateControl, validateControls } from "./lib/validation.js";
  import { Errors, Values, currentControl } from "./lib/store";
  import { onMount } from "svelte";
  import { merge } from "./lib/merge";

  export let controls = [];
  export let method = "POST";
  export let action = "";
  export let failOnError = true;

  let isReady = false;

  formatControls();

  $: if ($currentControl) {
    propagateOnChange($currentControl);
  }

  function formatControls() {
    let errors = {};
    let values = {};

    for (let i in controls) {
      controls[i].idx = Number(i) + 1;

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

  async function propagateOnChange(control) {
    if ("onChange" in control === false) {
      return;
    }

    let onChangeObj;
    let setValue;
    let newControl;

    for (let i in control.onChange) {
      onChangeObj = control.onChange[i];

      // check value if set
      if ("value" in onChangeObj && control.attributes.value !== onChangeObj.value) {
        continue;
      }
      // console.log(onChangeObj);

      if (typeof onChangeObj.set == "function") {
        setValue = await onChangeObj.set();
      } else {
        setValue = await onChangeObj.set;
      }

      if (typeof setValue == "object") {
        // loop through all the names returned by set
        for (let name in setValue) {
          // find control with name
          for (let i in controls) {
            if ("attributes" in controls[i] === false || name !== controls[i].attributes.name) {
              continue;
            }

            newControl = merge(
              controls[i],
              setValue[name],
              // do not change some values such as element & attributes.type
              {
                element: controls[i].element,
                attributes: {
                  id: controls[i].attributes.id,
                  name: controls[i].attributes.name,
                  type: controls[i].attributes.type,
                },
              }
            );

            // console.log(JSON.stringify(newControl,0,4));
            // validate
            validateControl(newControl);
            // assign value
            controls[i] = newControl;
          }
        }
      }
    }
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
