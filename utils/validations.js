import BadActorList from './bad-actor-list'

export function validateAccountName (value) {
  let i, label, len

  if (!value) {
    return 'Account name should not be empty'
  }

  const length = value.length

  if (length < 3) {
    return 'Account name should be longer than 3 charaters'
  }
  if (length > 16) {
    return 'Account name should be shorter.'
  }
  if (BadActorList.includes(value)) {
    return 'Use caution sending to this account. Please double check your spelling for possible phishing.'
  }

  const ref = value.split('.')

  for (i = 0, len = ref.length; i < len; i++) {
    label = ref[i]
    if (!/^[a-z]/.test(label)) {
      return 'Each account segment should start with a letter.'
    }
    if (!/^[a-z0-9-]*$/.test(label)) {
      return 'Each account segment should have only letters, digits, or dashes.'
    }
    if (/--/.test(label)) {
      return 'Each account segment should have only one dash in a row.'
    }
    if (!/[a-z0-9]$/.test(label)) {
      return 'Each account segment should end with a letter or digit.'
    }
    if (!(label.length >= 3)) {
      return 'Each account segment should be longer.'
    }
  }
  return null
}
