<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import "./styles/bootstrap-grid.scss";
  import "./styles/form.scss";
  import Buttons from "./elements/Buttons.svelte";
  import Control from "./elements/Control.svelte";
  import { validateControl, validateControls } from "./lib/validation.js";
  import { Errors, Values, currentControl } from "./lib/store";
  import { onMount } from "svelte";
  import { merge } from "./lib/merge";
  import { unique } from "shorthash";
  // manage form cookies
  import cookieStore from "./lib/cookieStore";
  import SuccessMessage from "./elements/SuccessMessage.svelte";

  export let controls = [];
  export let method = "POST";
  export let action = "";
  export let failOnError = true;

  export let onSubmit;

  export let buttons = [];
  export let layout = "vertical";

  export let successMessage = {
    title: "Submission Successful",
    text: "You have successfully submitted the form.",
  };

  let formId = unique(window.location);
  let showSuccess = false;
  let formerEl;

  // console.log({ showSuccess , successMessage});

  let isReady = false;
  let values = {};
  let formEl;

  formatControls();

  $: if ($currentControl) {
    propagateOnChange($currentControl);

    if ($currentControl && $currentControl.attributes) {
      values[$currentControl.attributes.name] = $currentControl.attributes.value;
      Values.update((o) => values);
    }
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
    try {
      if ("onChange" in control === false) {
        return;
      }

      let onChangeObj;
      let setValue;

      // control.onChangeResets = control.onChangeResets || {};

      for (let i in control.onChange) {
        onChangeObj = control.onChange[i];

        if (typeof onChangeObj.set == "function") {
          await onChangeObj.set.bind(control)(control.error, control.attributes.value, update);
        } else {
          update(onChangeObj.set);
        }
      }

      function update(data) {
        setValue = data;

        if (typeof setValue == "object") {
          // loop through all the names returned by set
          for (let name in setValue) {
            // find control with name
            for (let i in controls) {
              let newControl = null;

              if ("attributes" in controls[i] === false || name !== controls[i].attributes.name) {
                continue;
              }

              if (controls[i].creationMethod == "dynamic" && control.onChangeResets[name]) {
                controls[i] = control.onChangeResets[name];
                controls[i].creationMethod == "reset";
              }

              // check value if set
              if ("value" in onChangeObj && control.attributes.value !== onChangeObj.value) {
                continue;
              } else {
                // console.log(onChangeObj);

                control.onChangeResets[name] =
                  control.onChangeResets[name] || merge({}, controls[i]);

                newControl = merge(
                  controls[i],
                  setValue[name],
                  // do not change some values such as element & attributes.type
                  {
                    element: controls[i].element,
                    attributes: {
                      id: controls[i].attributes.id,
                      name: controls[i].attributes.name,
                    },
                    creationMethod: "dynamic",
                  }
                );

                // validate
                validateControl(newControl);

                // console.log(JSON.stringify(newControl,0,4));
                // console.log(newControl.attributes.name, newControl.attributes.value);
                // assign value
                controls[i] = newControl;

                setTimeout(() => {
                  currentControl.update((o) => controls[i]);
                }, 1);
              }
            }
          }
        }
      }
    } catch (error) {
      throw error;
    }
  }

  function hasErrors() {
    return Object.keys($Errors).length > 0;
  }

  function submitForm(e) {
    if (failOnError && hasErrors()) {
      e.preventDefault();
    }

    cookieStore.set(formId, true);

    if (typeof onSubmit == "function") {
      onSubmit(e, values);
    }
  }

  $: if (formId) {
    showSuccess = cookieStore.get(formId);
    if (showSuccess) {
      cookieStore.remove(formId);
    }
    // console.log({ formId });
  }

  onMount(async function () {
    validateControls(controls);
    isReady = true;

    setTimeout(() => {
      formId = unique(window.location.href) + "-" + unique(formerEl.innerHTML);
    }, 1);
  });
</script>

{#if isReady}
  <div class="former" bind:this={formerEl} id={formId}>
    {#if showSuccess && !onSubmit}
      <SuccessMessage {successMessage} />
    {:else}
      <form class="container-fluid" on:submit={submitForm} {action} {method} bind:this={formEl}>
        <div class="{layout} {layout == 'horizontal' ? 'row' : ''}">
          <div class={layout !== "horizontal" ? "row" : "col"}>
            {#each controls as control, i}
              <Control bind:control idx={i + 1} />
            {/each}
          </div>
          <div class={layout !== "horizontal" ? "row" : "col-auto"}>
            <div class="svlete-former-control-buttons">
              <Buttons {buttons} {formEl} />
            </div>
          </div>
        </div>
      </form>
    {/if}
  </div>
{/if}
