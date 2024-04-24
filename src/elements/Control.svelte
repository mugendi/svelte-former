<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { onMount } from "svelte";
  import Input from "./controls/Input.svelte";
  import Select from "./controls/Select.svelte";
  import Textarea from "./controls/Textarea.svelte";
  import { controlSchema, v } from "../lib/validator";
  import { merge } from "../lib/merge";

  export let controls;
  export let control;
  export let values;
  export let validationErrors;
  let controlContainer;

  let triggerTimeoutInt;

  // $:console.log(validationErrors);

  let hasError;
  let value;

  $: if (controlContainer) {
    value = control._value;
    hasError = control.hasError;
  }

  $: if (controlContainer) {
    // trigger observability on these two values
    hasError, value;
    onchangeTrigger();
  }

  function setControlData(name, data) {
    let newControl;
    let check;
    let isValid;
    let err;

    for (let i in controls) {
      if (controls[i].attributes.name == name) {
        
        newControl = merge(controls[i], data);

        check = v.compile(controlSchema);
        isValid = check([newControl]);
        // ensure new control is valid
        if (isValid === true) {
          if (control.resetValues) {
            control.resetValues[name] = control.resetValues[name] || Object.assign({}, controls[i]);
          }

          controls[i] = newControl;
        } else {
          for (let i in isValid) {
            err = isValid[i].message;
            if (isValid[i].expected) {
              err = err + " Expected: " + isValid[i].expected;
            }

            // console.error("OnChange Error for " + newControl.attributes.name + " Field\n  " + err);
          }
        }
      }
    }
  }

  function onChangeReset() {
    for (let name in control.resetValues) {
      setControlData(name, control.resetValues[name]);
    }
  }

  function onchangeTrigger() {
    // only if the onChange object is set && has a _value key
    if (!control.onChange || control._value === undefined) {
      return;
    }

    // clear to debounce
    clearTimeout(triggerTimeoutInt);

    control.resetValues = control.resetValues || {};

    let setData;
    let controlChanged = false;

    triggerTimeoutInt = setTimeout(() => {
      if (control.attributes.name in validationErrors === false) {
        // console.log(control.onChange.value, control._value);
        // if value is set, then ensure value matches exactly

        for (let i in control.onChange) {
          // if onChange.value does not match current control value
          if ("value" in control.onChange[i] && control.onChange[i].value !== control._value) {
            continue;
          }

          controlChanged = true;

          // Turn to JSON string
          setData = JSON.stringify(control.onChange[i].set, 0, 4);
          // Replace all matched values
          setData = setData.replace(/\{ME.VALUE\}/g, control._value);
          // console.log(control);
          setData = JSON.parse(setData);

          // console.log(JSON.stringify(setData, 0, 4));
          for (let name in setData) {
            setControlData(name, setData[name]);
          }
        }
      }

      // if no changes, then reset
      if (controlChanged === false) {
        onChangeReset();
      }

      //
    }, 500);
  }

  // trigger onchange event if value is set to ensure all methods called on:change are triggered
  function triggerInitialChange(element) {
    // console.log(element.value);

    if ("value" in control.attributes === false) {
      return;
    }

    // if (element.value || control.onChange) {
    setTimeout(() => {
      var event = new Event("change");
      // Dispatch it.
      element.dispatchEvent(event);
    }, 0);
    // }
  }

  onMount(() => {
    if (controlContainer) {
      let controlEl = controlContainer.querySelector("input,select,textarea");
      triggerInitialChange(controlEl);
    }
  });
</script>

{#if control.element == "input"}
  <Input bind:control bind:values bind:validationErrors bind:controlContainer />
{:else if control.element == "textarea"}
  <Textarea bind:control bind:values bind:validationErrors bind:controlContainer />
{:else if control.element == "select"}
  <Select bind:control bind:values bind:validationErrors bind:controls bind:controlContainer />
{:else}
  <svelte:element this={control.element} {...control.attributes}>
    {control.attributes.value || ""}
  </svelte:element>
{/if}
