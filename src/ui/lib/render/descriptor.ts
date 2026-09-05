import type { OptionsDescriptor } from '@dicebear/core';

/** The option descriptor as core builds it, typed off the class since it is not exported. */
export type Descriptor = ReturnType<InstanceType<typeof OptionsDescriptor>['toJSON']>;
export type FieldDescriptor = Descriptor[string];
