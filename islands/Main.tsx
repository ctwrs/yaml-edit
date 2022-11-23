import { lodash as _ } from "lodash";
import { parse, stringify } from "yaml";

import { useEffect, useMemo } from "preact/hooks";
import { Signal, signal, useComputed, useSignal } from "@preact/signals";

import { yamlFile, yamlTags } from "../data/TestData.ts";

export const error = signal<Error | null>(null);

type Config = {
  item_in_separate_row: boolean;
};
const config = signal<Config>({ item_in_separate_row: false });

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

type File = Record<string, { Tags: string[] }>;
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
  props: { toggleTag: (tag: string) => void; tags: Signal<string[]>; tag: string },
) {
  const uuid = useMemo(() => crypto.randomUUID(), []);
  const tagIndex = props.tags.value.indexOf(props.tag);
  return (
    <div class="flex items-center">
      <input
        type="checkbox"
        id={uuid}
        class="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
        checked={tagIndex > -1}
        onChange={() => props.toggleTag(props.tag)}
      />
      <label for={uuid} class="ml-2 block text-sm leading-5 text-gray-900">
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
  props: { tags: Signal<string[]>; category: string[]; categoryName: string },
) {
  const showList = useSignal(false);

  const [checked, unchecked] = useMemo(
    () => partition(props.category, (tag) => props.tags.value.includes(tag)),
    [props.tags.value, props.category],
  );
  const toggleTag = (tag: string) => {
    if (props.tags.value.includes(tag)) {
      props.tags.value = props.tags.value.filter((t) => t !== tag);
    } else {
      props.tags.value = [...props.tags.value, tag];
    }
  };
  return (
    <td
      class="text-xs px-1 text-gray-300"
      onMouseEnter={() => showList.value = true}
      onMouseLeave={() => {
        showList.value = false

      }}
    >
      <ul>
        {props.category &&
          // props.category.filter((tag, i) => showList.value ? true : i <= 6 //tagLookup[tag]
          // ).map((tag) => <CheckboxTag tags={props.tags} tag={tag} />)}
          checked.map((tag) => <CheckboxTag toggleTag={toggleTag} tags={props.tags} tag={tag} />)}
        {unchecked.length > 0 && unchecked.filter((_, i) =>
          showList.value ? true : i + checked.length < 6
        ).map((tag) => <CheckboxTag toggleTag={toggleTag} tags={props.tags} tag={tag} />)}
      </ul>
    </td>
  );
};

const TagCategoryHeader = function TagCategoryHeader(
  props: { categoryName: string },
) {
  const lowercaseCategoryNames = useComputed(() => {
    return parsedTags.value[props.categoryName].map((tag) => tag.toLowerCase());
  });
  return (
    <th class="sticky top-0">
      <p>{props.categoryName}</p>
      <InputBox
        isValid={(value) => {
          if (!parsedTags.value) {
            return [false, "No file loaded"];
          }
          if (lowercaseCategoryNames.value.indexOf(value.toLowerCase()) > -1) {
            return [false, "Item already exists"];
          }
          return [true, ""];
        }}
        onClick={(value) => {
          if (!parsedTags.value) return false;
          parsedTags.value[props.categoryName] = [
            ...parsedTags.value[props.categoryName],
            value,
          ];
          parsedFile.value = { ...parsedFile.value };
          return true;
        }}
      />
    </th>
  );
};

const InputBox = function InputBox(
  props: {
    isValid: (value: string) => [boolean, string];
    onClick: (value: string) => boolean;
  },
) {
  const value = useSignal("");
  const error = useSignal("");
  const isValid = useSignal(true);
  return (
    <div>
      <input
        type="text"
        class="w-3/4 border-1 text-indigo-600 transition duration-150 ease-in-out"
        value={value.value}
        onInput={(e) => {
          const v = e.currentTarget?.value;
          const [valIsValid, valError] = props.isValid(v);
          error.value = valError || "";
          isValid.value = valIsValid;
          value.value = v;
        }}
      />
      <button
        class="w-1/4 text-sm text-gray-900"
        onClick={() => {
          props.onClick(value.value.trim()) && (value.value = "");
        }}
        disabled={!isValid.value || !value.value.trim()}
      >
        +
      </button>
      <div class="flex flex-row text-sm text-red-400">{error.value}</div>
    </div>
  );
};

const TagItemHeader = function TagItemHeader() {
  return (
    <th class="sticky top-0">
      <p class="flex flex-row">Item</p>
      <InputBox
        isValid={(value) => {
          if (!parsedFile.value) {
            return [false, "No file loaded"];
          }
          if (parsedFile.value[value]) {
            return [false, "Item already exists"];
          }
          return [true, ""];
        }}
        onClick={(value) => {
          if (!parsedFile.value) return false;
          parsedFile.value = { ...parsedFile.value, [value]: { Tags: [] } };
          return true;
        }}
      />
    </th>
  );
};

const Entry = function Entry(
  props: { name: string; s: Signal<Tags>; f: Signal<File> },
) {
  const tags = useSignal(props.f.value[props.name].Tags);

  const rest = props.s.value &&
      Object.keys(props.s.value).map((category) => (
        <TagCategory
          tags={tags}
          category={props.s.value[category]}
          categoryName={category}
        />
      ));

  const onLeave = () => {
    if (_.isEqual(tags.value, props.f.value[props.name].Tags)) {
      console.log('tags are not different, bye');
      return;
    }
    props.f.value[props.name].Tags = tags.value;
    props.f.value = { ...props.f.value };
    console.log('tags are different, updating');
  }

  return  config.value.item_in_separate_row ? (
    <><tr class="bg-white align-top ">
        <td colSpan={Object.keys(props.s.value).length}>
        {props.name}
        </td>
      </tr>
    <tr class="hover:bg-gray-300 align-top " onMouseLeave={onLeave}>
    <td></td>
    { rest }
  </tr>
  </>
  ) : (
    <tr class="hover:bg-gray-300 align-top " onMouseLeave={onLeave}>
    <td class="sticky left-0 bg-white">{props.name}</td>
    { rest }
  </tr>
  )

  ;
};

const List = function List() {
  if (!parsedFile.value) return null;
  if (!parsedTags.value) return null;
  console.log('rendering list');
  return (
    <table class="align-top">
      <thead>
        <tr class='sticky top-0 bg-white opacity-80 z-10'>
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
      <List />
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
        <input
        type="checkbox"
        class="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
        checked={config.value.item_in_separate_row}
        onChange={() => {
          config.value = { ...config.value, item_in_separate_row: !config.value.item_in_separate_row };
        }}
      />
      <label class="ml-2 block text-sm leading-5 text-gray-900">
        Item in separate row
      </label>
      </div>
    </div>
  );
}
