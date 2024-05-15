<!--
 Copyright (c) 2024 Anthony Mugendi
 
 This software is released under the MIT License.
 https://opensource.org/licenses/MIT
-->

<script>
  import { validate } from "../lib/validation";
  import { successMessageSchema } from "../lib/schema";

  export let successMessage;

  // validate
  validate({ successMessage }, successMessageSchema);
</script>

<div
  class="submit-successful"
  style="--bgColor:{successMessage.style.bgColor};--textColor:{successMessage.style.textColor};"
>
  {#if successMessage.title}
    <h4>{successMessage.title}</h4>
  {/if}
  {@html successMessage.text || successMessage}
</div>

<style lang="scss">
  .submit-successful {
    padding: 10px;
    color: var(--textColor);
    background: var(--bgColor);
    text-align: center;
    margin: 10px 0;
  }
  .submit-successful h4 {
    margin: 0 0 10px !important;
  }
</style>
