<template>
  <div class="file-input">
    <div @click="launchFilePicker()">
      <slot name="activator" />
    </div>

    <input
      ref="file"
      type="file"
      :accept="accepts"
      :name="uploadFieldName"
      style="display:none"
      @change="onFileChange($event.target.name, $event.target.files)"
    >

    <b-alert :show="error" dismissible class="mt-2">
      {{ errorText }}
    </b-alert>
  </div>
</template>

<script>
export default {
  name: 'FileInput',

  props: {
    maxSize: { type: Number, default: 1024 },
    disabled: { type: Boolean },
    accepts: { type: String, default: 'image/png,image/jpeg,application/pdf' }
  },

  data () {
    return {
      error: null,
      errorText: '',
      uploadFieldName: 'file'
    }
  },

  methods: {
    launchFilePicker () {
      this.error = false
      if (!this.disabled) { this.$refs.file.click() }
    },

    onFileChange (fieldName, file) {
      const { maxSize } = this
      const uploadedFile = file[0]

      if (file.length > 0) {
        const size = uploadedFile.size / (1024 * 1024)

        if (!this.accepts.includes(uploadedFile.type)) {
          this.error = true
          this.errorText = 'Please choose a supported file'
        } else if (size > maxSize) {
          this.error = true
          this.errorText = `Your file is too big! Please select an image under ${maxSize} MB`
        } else {
          const formData = new FormData()
          const url = URL.createObjectURL(uploadedFile)
          formData.append(fieldName, uploadedFile)
          this.$emit('input', { url, uploadedFile })
        }
      }
    }
  }

}
</script>

<style lang="scss">
.file-input {
  display: inline-block;

  .b-avatar {
    display: block;
    cursor: pointer;

    &.disabled {
      cursor: not-allowed;
    }
  }
}
</style>
