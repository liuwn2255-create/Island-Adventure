function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Validates the data shape for a selectable character without loading its model. */
export function isCharacterMetadata(character) {
  return isRecord(character)
    && typeof character.id === 'string'
    && character.id.trim().length > 0
    && typeof character.name === 'string'
    && character.name.trim().length > 0
    && typeof character.modelPath === 'string'
    && character.modelPath.trim().length > 0
    && isRecord(character.displayMetadata)
    && typeof character.displayMetadata.description === 'string'
    && character.displayMetadata.description.trim().length > 0;
}