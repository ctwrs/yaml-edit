import { lodash as _ } from "lodash";
import { parse, stringify } from "yaml";

import { computed, Signal, signal, useComputed, useSignal } from "@preact/signals";

import { yamlFile, yamlTags } from "../data/TestData.ts";

export const error = signal<Error | null>(null);

const parsedTags = signal<Record<string, string[]>>({});

const parseTags = (tags: string) => {
  let parsed: Record<string, string[]>;
  try {
    parsed = parse(tags || "") as Record<string, string[]>;
    if (!parsed) return null;
  } catch (e) {
    error.value = e;
    return null;
  }
  return parsed;
};

// const tagCategories = computed(() => {
//   const tags = parsedTags.value;
//   if (!tags) return null;
//   return Object.keys(tags).reduce((acc, key) => {
//     Object.keys(tags[key]).forEach((tag) => {
//       acc[tag] = key;
//     });
//     return acc;
//   }, {} as Record<string, string>);
// });

const tagCategoryMap = computed(() => {
  const tags = parsedTags.value;
  if (!tags) return null;
  return Object.keys(tags).reduce((acc, key) => {
    Object.keys(tags[key]).forEach((tag) => {
      acc[tag] = key;
    });
    return acc;
  }, {} as Record<string, string>);
});

const parsedFile = signal<
Record<string, Record<string, string[]>>
>({});

const parseFile = (file: string) => {
  let parsed: Record<string, { Tags: string[] }>;
  try {
    parsed = parse(file || "") as Record<string, { Tags: string[] }>;
    console.log(parsed);
    if (!parsed) return null;
  } catch (e) {
    error.value = e;
    return null;
  }
  return parsed;
};

const dataModel = signal<Record<string, Record<string, Record<string, boolean>>>>({});


// TODO
// instead of prepping the data we should just use the data as is
// then use tags also as is, and use computed lookups to match, this will make adding tags pretty easy

// const buildDataModel = (parsedFile: Record<string, Record<string, string[]>>) => {
//   if (!parsedTags.value) return null;
//   if (!tagCategoryMap.value) return null;

//   // @ts-ignore wtf type inference that's not correct
//   const formated: Record<string, Record<string, Record<string, boolean>>> =
//   // @ts-ignore possibly null but it's fine
//     Object.entries(parsedFile).reduce((acc, [key, value]) => {
//       if (!parsedTags.value) return null;
//       const tags = _.cloneDeep(parsedTags.value);

//       value.Tags.forEach((tag) => {
//         if (!tagCategoryMap.value) return null;
//         const category = tagCategoryMap.value[tag];
//         if (!category) return;
//         tags[category][tag] = true;
//       });
//       acc[key] = tags;

//       return acc;
//     }, {} as Record<string, Record<string, Record<string, boolean>>>);
//   console.log(formated);
//   return formated;
// };

const ChipTag = function ChipTag(
  props: { category: Signal<Record<string, boolean>>; tag: string },
) {
  return (
    <span class="m-[5px] flex items-center justify-center rounded border-[.5px]  bg-[#EEEEEE] py-[6px] px-[10px] text-sm font-medium">
      {props.tag}
      <span
        class="cursor-pointer pl-2"
        onClick={() =>
          props.category.value = {
            ...props.category.value,
            [props.tag]: false,
          }}
      >
        x
      </span>
    </span>
  );
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
            props.tags.splice(tagIndex, 1)
           } else {
            props.tags.push(props.tag)
           }
          }}
      />
      <label class="ml-2 block text-sm leading-5 text-gray-900">
        {props.tag}
      </label>
    </div>
  );
};

const TagCategory = function TagCategory(
  props: { tags: string[], category: string[]; categoryName: string },
) {
  const showList = useSignal(false);
  const value = useSignal("");
  const tagLookup = props.tags.reduce((acc, curr) => {
    acc[curr] = true;
    return acc;
  }, {} as Record<string, boolean>);
  return (
    <div
      class="text-xs px-1 text-gray-300 rounded"
      onMouseEnter={() => showList.value = true}
      onMouseLeave={() => showList.value = false}
    >
      {props.categoryName}
      <div class="text-gray-800 relative z-20 w-full rounded-md border p-[5px] font-medium outline-none transition disabled:cursor-default disabled:bg-[#F5F7FD]">
        {
          /* <div class="flex flex-wrap items-center">
          {Object.keys(category.value).filter((key) => category.value[key]).map((
            tag,
          ) => <ChipTag category={category} tag={tag} />)}
        </div> */
        }
        <ul>
          {props.category && props.category.filter((tag) =>
            showList.value ? true : tagLookup[tag]
          ).map((tag) => <CheckboxTag tags={props.tags} tag={tag} />)}
        </ul>
        {showList.value && (
              <div class="flex items-center">
              <input
                type="text"
                class="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                onChange={(e) => value.value = e.currentTarget?.value}
              />
              <button
                class="ml-2 block text-sm leading-5 text-gray-900"
                onClick={() => {
                  if (!parsedTags.value) return;
                  console.log(value.value);
                  parsedTags.value[props.categoryName].push(value.value);
                  value.value = "";
                }}
              >
                +
              </button>
            </div>
        )}
      </div>
    </div>
  );
};

const TagCategories = function TagCategories(
  props: { tags: string[] },
) {
  return (
    <>
      {parsedTags.value &&
        Object.keys(parsedTags.value).map((category) => (
          <TagCategory
            tags={props.tags}
            category={parsedTags.value[category]}
            categoryName={category}
          />
        ))}
    </>
  );
};

const Entry = function Entry(
  props: { name: string; tags: string[] },
) {
  return (
    <div class="flex">
      <div class="justify-center">{props.name}</div>
      <TagCategories tags={props.tags} />
    </div>
  );
};

const List = function List() {
  const parsed = parsedFile.value;
  if (!parsed) return null;
  return (
    <>
      {Object.keys(parsed).map((key) => (
        //@ts-ignore wtf it returns an array as parsed, fuck that
        <Entry name={key} tags={parsed[key].Tags} />
      ))}
    </>
  );
};

export default function Main() {
  const localYamlTags = useSignal(yamlTags);
  const localYamlFile = useSignal(yamlFile);

  return (
    <div class="container w-full md:w-4/5 xl:w-3/5  mx-auto px-2">
      <div class="p-8 mt-6 lg:mt-0 rounded shadow bg-white">
        <List />
      </div>
      <div class="grid grid-flow-col auto-cols-max grid-cols-6">
        <div>
      <h3>Yaml Tags</h3>
      <textarea rows={10} onChange={(e) => localYamlTags.value = e.currentTarget.value}>
        {localYamlTags.value}
      </textarea>
      </div>
      <div>
      <h3>Yaml File</h3>
      <textarea rows={10} onChange={(e) => localYamlFile.value = e.currentTarget.value}>
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
          // const model = buildDataModel(parsedFile.value);
          // if (!model) {
          //   console.error("no model");
          //   return;
          // }
          // dataModel.value = model;
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
        Dump
      </button>

      {error.value && (
        <div
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong class="font-bold">Error!</strong>
          <span class="block sm:inline">{JSON.stringify(error, null, 4)}</span>
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
