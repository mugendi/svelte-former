<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { onMount } from "svelte";
  import Error from "../Error.svelte";
  import Label from "../Label.svelte";
  import { triggerChange, waitForAll } from "../../lib/utils";

  export let control;
  export let onChange;

  let isReady = false;
  let fuse;
  let showAutoComplete = false;

  // Format list
  let autocompleteVals = [];

  //   console.log(JSON.stringify(control.options,0,4));

  $: if (isReady && control.options.length) {
    autocompleteVals = control.options.map((o) => {
      if (typeof o !== "object") {
        return { value: o };
      } else if (!o.value) {
        o.value = o.text || o.id;
      }

      return o;
    });

    // console.log(JSON.stringify(autocompleteVals, 0, 4));
    // Set up the Fuse instance
    fuse = new Fuse(autocompleteVals, {
      keys: ["value"],
    });
  }
  let filteredAutocompleteVals = [];

  function autocompleteSearch(v) {
    if (!v) {
      filteredAutocompleteVals = [];
      return;
    }
    //  Now search!
    let resp = fuse.search(v).map((o) => {
      let obj = o.item;
      obj.search = v;
      return obj;
    });

    filteredAutocompleteVals = resp;
  }

  function setValue(v) {
    control.attributes.value = v;
    triggerChange(control);
    filteredAutocompleteVals = [];
  }

  function onType(e) {
    onChange(e);
    if (isReady) {
      autocompleteSearch(e.target.value);
    }
  }

  $: if (filteredAutocompleteVals.length > 0) {
    showAutoComplete = true;
  }

  onMount(async function () {
    // Wait for Fuse to load
    let waitFor = ["Fuse"];
    await waitForAll(waitFor);
    isReady = true;
  });
</script>

<div class="label-container">
  <Label bind:control />
  <Error bind:control />
</div>

<svelte:head>
  {#if !window.Fuse}
    <script src="https://cdn.jsdelivr.net/npm/fuse.js/dist/fuse.js"></script>
  {/if}
</svelte:head>

<input
  {...control.attributes}
  on:change={onType}
  on:keyup={onType}
  bind:this={control.node}
  on:blur={() => {
    setTimeout(() => {
      showAutoComplete = false;
    }, 500);
  }}
/>

{#if showAutoComplete}
  <div class="svelte-former-autocomplete">
    <ul>
      {#each filteredAutocompleteVals as val}
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <li on:click={setValue.bind(null, val.value)}>
          {val.value}
        </li>
      {/each}
    </ul>
  </div>
{/if}
