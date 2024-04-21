<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  export let control;
  export let validationErrors;
</script>

<!-- Field Error -->
{#if validationErrors && validationErrors[control.attributes.name]}
  <span class="field-error">
    {@html validationErrors[control.attributes.name]}
  </span>
{/if}
