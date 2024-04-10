<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  export let type = "text";
  export let classes = [];
  export let value = null;
  export let values = [];
  export let placeholder = "Enter Value";
  export let id;
  export let required;
  export let name;
  export let autocomplete;

  let checked;
  let origValue = value;
  export let selectedValue;

  $: if (type == "checkbox") {
    if (origValue) {
      value = checked ? origValue : null;
    } else {
      value = checked;
    }
  }
</script>

{#if type == "text"}
  <input
    class={classes.join(" ")}
    type="text"
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
  />
{:else if type == "button"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="button"
  />
{:else if type == "color"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="color"
  />
{:else if type == "date"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="date"
  />
{:else if type == "datetime-local"}
  <input class={classes.join(" ")} {id} {placeholder} {required} bind:value type="datetime-local" />
{:else if type == "email"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="email"
  />
{:else if type == "file"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="file"
  />
{:else if type == "hidden"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="hidden"
  />
{:else if type == "image"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="image"
    alt={id}
  />
{:else if type == "month"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="month"
  />
{:else if type == "number"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="number"
  />
{:else if type == "password"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="password"
  />
{:else if type == "range"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="range"
  />
{:else if type == "reset"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="reset"
  />
{:else if type == "search"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="search"
  />
{:else if type == "submit"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="submit"
  />
{:else if type == "tel"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="tel"
  />
{:else if type == "time"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="time"
  />
{:else if type == "url"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="url"
  />
{:else if type == "week"}
  <input
    class={classes.join(" ")}
    {id}
    {placeholder}
    {required}
    {name}
    {autocomplete}
    bind:value
    type="week"
  />

  <!-- Radio & Checkbox -->
{:else if type == "radio"}
  <span class="input-group">
    {#each values as _value}
      <input
        class="radio {classes.join(' ')}"
        {id}
        {placeholder}
        {required}
        {name}
        value={_value}
        bind:group={value}
        type="radio"
      />
      &nbsp; {_value}
    {/each}
  </span>
{:else if type == "checkbox"}
  <span class="input-group">
    <input
      class="checkbox {classes.join(' ')}"
      {id}
      {placeholder}
      {required}
      {name}
      bind:checked
      bind:value
      type="checkbox"
    />
  </span>
{/if}
