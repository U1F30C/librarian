import PSON from "pson";
import { sia, desia } from "sializer";
import bigjson from "big-json";

import BufferSerializer from "buffer-serializer";
const serializer = new BufferSerializer();

const pson = new PSON.StaticPair([]);

export interface JSONSerializer {
  serialize(indexJson: any): Promise<string | Buffer>;
  deserialize(data: string | Buffer): Promise<any>;
}

// JSON.stringify: heap out of memory
export const JSONSerializer: JSONSerializer = {
  serialize: async (data: any) => JSON.stringify(data),
  deserialize: async (data: string | Buffer) => JSON.parse(data.toString()),
};

// heap out of memory
export const SiaSerializer: JSONSerializer = {
  serialize: async (data: any) => sia(data),
  deserialize: async (data: Buffer) => desia(data),
};

// heap out of memory
export const BufferSerializerSerializer: JSONSerializer = {
  serialize: async (data: any) => serializer.toBuffer(data),
  deserialize: async (data: Buffer) => serializer.fromBuffer(data),
};

// heap out of memory
export const PSONSerializer: JSONSerializer = {
  serialize: async (data: any) => pson.toBuffer(data) as Buffer,
  deserialize: async (data) => pson.decode(data),
};

// big-json: heap allocation error
export const BigJsonSerializer: JSONSerializer = {
  serialize: (data: any) => bigjson.stringify({ body: data }),
  deserialize: (data: any) => bigjson.parse({ body: data }),
};
