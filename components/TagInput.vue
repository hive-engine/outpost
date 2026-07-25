<template>
  <b-form-group :label="label" :state="isValid || isUnique || withinLimit" :description="description">
    <div class="tags-input h-100 d-flex align-items-center flex-wrap">
      <div v-for="(tag, index) in tags" :key="`${tag}-${index}`" class="tag-button mw-100 d-inline-flex mb-1" :class="`bg-${tagVariant}`">
        {{ tag }}
        <button class="btn-close" aria-label="Remove tag" @click="removeTag(index)" />
      </div>

      <div class="flex-grow-1">
        <input
          v-model="tagText"
          type="text"
          :placeholder="placeholder"
          class="tag-input w-100 flex-grow-1 p-0 m-0 bg-transparent border-0"
          @keydown="onKeydown"
        >
      </div>
    </div>

    <template #invalid-feedback>
      <template v-if="!withinLimit">
        {{ limitText }}
      </template>
      <template v-else-if="!isValid">
        {{ invalidTagText }}
      </template>
      <template v-else-if="!isUnique">
        {{ duplicateTagText }}
      </template>
    </template>
  </b-form-group>
</template>

<script>
// Ported from legacy/components/TagInput.vue (Options API kept).
// Vue 3 v-model: `value` prop / `input` event → `modelValue` / `update:modelValue`
// (parents keep using plain v-model). Numeric keycode modifier @keydown.188 (comma)
// was removed in Vue 3 → single onKeydown handler matching event.key.
// BS5: `close` → `btn-close` (× glyph comes from the button itself).
export default {
  name: 'TagInput',
  inheritAttrs: false,

  props: {
    label: { type: String, default: '' },
    description: { type: String, default: '' },
    modelValue: { type: Array, default: () => [] },
    tagVariant: { type: String, default: 'secondary' },
    placeholder: { type: String, default: 'Enter a Tag' },
    tagValidator: { type: Function, default: () => true },
    allowDuplicates: { type: Boolean, default: false },
    invalidTagText: { type: String, default: 'Invalid tag' },
    duplicateTagText: { type: String, default: 'Duplicate tag' },
    limitText: { type: String, default: 'Max limit reached' },
    max: { type: Number, default: 1000 }
  },

  emits: ['update:modelValue'],

  data () {
    return {
      tagText: '',

      withinLimit: true,
      isValid: true,
      isUnique: true
    }
  },

  computed: {
    tags () {
      return this.modelValue
    }
  },

  watch: {
    tagText (value) {
      if (value !== '') {
        this.withinLimit = false
        this.isValid = false
        this.isUnique = false

        if (this.max <= this.tags.length) {
          this.withinLimit = false
        } else if (!this.tagValidator(value)) {
          this.isValid = false
        } else if (!this.allowDuplicates && !this.checkDuplicates(value)) {
          this.isUnique = false
        } else {
          this.isValid = true
          this.isUnique = true
        }
      } else {
        this.withinLimit = true
        this.isValid = true
        this.isUnique = true
      }
    }
  },

  methods: {
    onKeydown (event) {
      // Legacy: @keydown.enter / @keydown.space / @keydown.188 (comma) → addTag,
      // @keydown.delete (Backspace + Delete) → removeLastTag
      if (event.key === 'Enter' || event.key === ' ' || event.key === ',') {
        this.addTag(event)
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        this.removeLastTag(event)
      }
    },

    addTag (event) {
      event.preventDefault()

      const val = event.target.value.trim()

      if (val.length > 0 && this.tagValidator(val) && this.checkDuplicates(val) && this.max > this.tags.length) {
        this.tags.push(val)

        this.$emit('update:modelValue', this.tags)

        this.tagText = ''
      }
    },

    removeTag (index) {
      this.tags.splice(index, 1)

      this.$emit('update:modelValue', this.tags)
    },

    removeLastTag (event) {
      if (event.target.value.length === 0) {
        this.removeTag(this.tags.length - 1)
      }
    },

    checkDuplicates (val) {
      if (!this.allowDuplicates) {
        return !this.tags.includes(val)
      }

      return true
    }
  }
}
</script>
