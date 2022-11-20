import { lodash as _ } from "lodash";
import { parse, stringify } from "yaml";

import { useMemo } from "preact/hooks";
import { Signal, signal, useSignal } from "@preact/signals";

import { yamlFile, yamlTags } from "../data/TestData.ts";

export const error = signal<Error | null>(null);

type Tags = Record<string, string[]>;
const parsedTags = signal<Tags>({});

const parseTags = (tags: string) => {
  let parsed: Tags;
  try {
    parsed = parse(tags || "") as Tags;
    if (!parsed) return null;
  } catch (e) {
    error.value = e;
    return null;
  }
  return parsed;
};

type File = Record<string, {Tags: string[]}>;
const parsedFile = signal<File>({});

const parseFile = (file: string) => {
  let parsed: File;
  try {
    parsed = parse(file || "") as File;
    console.log(parsed);
    if (!parsed) return null;
  } catch (e) {
    error.value = e;
    return null;
  }
  return parsed;
};

const CheckboxTag = function CheckboxTag(
  props: { tags: string[]; tag: string },
) {
  const tagIndex = props.tags.indexOf(props.tag);
  return (
    <div class="flex items-center">
      <input
        type="checkbox"
        class="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
        checked={tagIndex > -1}
        onChange={() => {
          if (tagIndex > -1) {
            props.tags.splice(tagIndex, 1);
          } else {
            props.tags.push(props.tag);
          }
        }}
      />
      <label class="ml-2 block text-sm leading-5 text-gray-900">
        {props.tag}
      </label>
    </div>
  );
};

const partition = (arr: string[], predicate: (item: string) => boolean) => {
  const result = [[], []] as string[][];
  for (const item of arr) {
    result[predicate(item) ? 0 : 1].push(item);
  }
  return result;
};

const TagCategory = function TagCategory(
  props: { tags: string[]; category: string[]; categoryName: string },
) {
  const showList = useSignal(false);
  const [checked, unchecked] = useMemo(() => partition(props.category, (tag) => props.tags.includes(tag)), [props.tags, props.category]);
  return (
    <td class="text-xs px-1 text-gray-300"
    onMouseEnter={() => showList.value = true}
      onMouseLeave={() => showList.value = false}>
      <ul>
        {props.category &&
          // props.category.filter((tag, i) => showList.value ? true : i <= 6 //tagLookup[tag]
          // ).map((tag) => <CheckboxTag tags={props.tags} tag={tag} />)}
          checked.map((tag) => <CheckboxTag tags={props.tags} tag={tag} />)}
          {unchecked.length > 0 && unchecked.filter((_, i) => showList.value ? true : i + checked.length < 6).map((tag) => <CheckboxTag tags={props.tags} tag={tag} />)}
      </ul>
    </td>
  );
};

const TagCategoryHeader = function TagCategoryHeader(
  props: { categoryName: string },
) {
  const showList = useSignal(true);
  const value = useSignal("");
  return (
    <th
      class='sticky top-0'
      // onMouseEnter={() => showList.value = true}
      // onMouseLeave={() => showList.value = false}
    >
      <p>{props.categoryName}</p>

      {showList.value && (
        <div class="flex items-center">
          <input
            type="text"
            class=" text-indigo-600 transition duration-150 ease-in-out"
            onChange={(e) => value.value = e.currentTarget?.value}
          />
          <button
            class="ml-2 block text-sm leading-5 text-gray-900"
            onClick={() => {
              if (!parsedTags.value) return;
              console.log(value.value);
              // parsedTags.value[props.categoryName].push(value.value);
              parsedTags.value[props.categoryName] = [ ...parsedTags.value[props.categoryName], value.value];
              parsedFile.value = {...parsedFile.value};
              value.value = "";
            }}
          >
            +
          </button>
        </div>
      )}
    </th>
  );
};

const TagItemHeader = function TagItemHeader() {
  const showList = useSignal(true);
  const value = useSignal("");
  return (
    <th
      class='sticky top-0'
      // onMouseEnter={() => showList.value = true}
      // onMouseLeave={() => showList.value = false}
    >
      <p>Item</p>
      {showList.value && (
        <div class="flex items-center">
          <input
            type="text"
            class=" text-indigo-600 transition duration-150 ease-in-out"
            onChange={(e) => value.value = e.currentTarget?.value}
          />
          <button
            class="ml-2 block text-sm leading-5 text-gray-900"
            onClick={() => {
              if (!parsedFile.value) return;
              parsedFile.value = { ...parsedFile.value, [value.value]: { Tags: [] }};
              value.value = "";
            }}
          >
            +
          </button>
        </div>
      )}
    </th>
  );
};

const Entry = function Entry(
  props: { name: string; s: Signal<Tags>; f: Signal<File> },
) {
  return (
    <tr class='hover:bg-gray-100 align-top '>
      <td class='sticky left-0 '>{props.name}</td>
      {props.s.value &&
        Object.keys(props.s.value).map((category) => (
          <TagCategory
            tags={props.f.value[props.name].Tags}
            category={props.s.value[category]}
            categoryName={category}
          />
        ))}
    </tr>
  );
};

const List = function List() {
  if (!parsedFile.value) return null;
  if (!parsedTags.value) return null;
  return (
    <table class='align-top'>
      <thead>
        <tr>
          <TagItemHeader />
          {Object.keys(parsedTags.value).map((category) => (
            <TagCategoryHeader categoryName={category} />
          ))}
        </tr>
      </thead>
      <tbody>
        {Object.keys(parsedFile.value).map((key) => (
          //@ts-ignore wtf it returns an array as parsed, fuck that
          <Entry name={key} f={parsedFile} s={parsedTags} />
        ))}
      </tbody>
    </table>
  );
};

export default function Main() {
  const localYamlTags = useSignal(yamlTags);
  const localYamlFile = useSignal(yamlFile);

  return (
    <div class="container w-full mx-0 px-0">
      <div class="p-8 mt-6 lg:mt-0 bg-white">
        <List />
      </div>
      <div class="grid grid-flow-col auto-cols-max grid-cols-6">
        <div>
          <h3>Yaml Tags</h3>
          <textarea
            rows={10}
            onChange={(e) => localYamlTags.value = e.currentTarget.value}
          >
            {localYamlTags.value}
          </textarea>
        </div>
        <div>
          <h3>Yaml File</h3>
          <textarea
            rows={10}
            onChange={(e) => localYamlFile.value = e.currentTarget.value}
          >
            {localYamlFile.value}
          </textarea>
        </div>

        <button
          type="button"
          class="py-2 px-3 bg-black text-white text-sm font-semibold rounded-md shadow focus:outline-none"
          onClick={() => {
            const tags = parseTags(localYamlTags.value);
            if (!tags) {
              console.error("no tags");
              return;
            }
            parsedTags.value = tags;
            const file = parseFile(localYamlFile.value);
            if (!file) {
              console.error("no file");
              return;
            }
            parsedFile.value = file;
          }}
        >
          Parse
        </button>

        <button
          type="button"
          class="py-2 px-3 bg-black text-white text-sm font-semibold rounded-md shadow focus:outline-none"
          onClick={() => {
            // should take
          }}
        >
          Dump (not implemented)
        </button>

        {error.value && (
          <div
            class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
            role="alert"
          >
            <strong class="font-bold">Error!</strong>
            <span class="block sm:inline">
              {JSON.stringify(error, null, 4)}
            </span>
          </div>
        )}

        <button
          class="py-2 px-3 bg-black text-white text-sm font-semibold rounded-md shadow focus:outline-none"
          onClick={() =>
            navigator.clipboard.writeText(stringify(parsedTags.value))}
        >
          Get Tags
        </button>
        <button
          class="py-2 px-3 bg-black text-white text-sm font-semibold rounded-md shadow focus:outline-none"
          onClick={() =>
            navigator.clipboard.writeText(stringify(parsedFile.value))}
        >
          Get Yaml
        </button>
      </div>
    </div>
  );
}
