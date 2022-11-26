import { lodash as _ } from "lodash";
import { parse, stringify } from "yaml";

import { useEffect, useMemo } from "preact/hooks";
import {
  computed,
  Signal,
  signal,
  useComputed,
  useSignal,
} from "@preact/signals";

import { yamlFile, yamlTags } from "../data/TestData.ts";

let ls: Storage;
if (typeof localStorage !== "undefined") {
  ls = localStorage;
} else {
  // @ts-ignore we dont use more than get and set
  ls = {
    getItem: () => null,
    setItem: () => {},
  };
}

const useUuid = () => useMemo(() => crypto.randomUUID(), []);

export const error = signal<
  {
    mark: { buffer: string; position: number; line: number; column: number };
    name: string;
    file: string;
  } | null
>(null);

type Config = Record<string, string>;
const config = signal<Config>({
  item_in_separate_row: "false",
  enlarge_categories: "1",
});

type Tags = Record<string, string[]>;
const parsedTags = signal<Tags>({});

const parseTags = (tags: string) => {
  let parsed: Tags;
  try {
    parsed = parse(tags || "") as Tags;
    if (!parsed) return null;
  } catch (e) {
    e.file = "tags";
    error.value = e;
    return null;
  }
  return parsed;
};

const widestTagCategories = computed(() => {
  const tags = parsedTags.value;
  console.log({ tags });
  const categories = Object.keys(tags);
  const widest = categories.reduce((acc, category) => {
    console.log(tags[category]);
    acc[category] = tags[category].sort((a, b) =>
      a.length - b.length
    ).reverse()[0];
    console.log(acc[category]);
    return acc;
  }, {} as Record<string, string>);

  const r = Object.keys(widest).sort((a, b) =>
    widest[a].length - widest[b].length
  ).reverse().slice(0, parseInt(config.value.enlarge_categories)); // an array of categories sorted by length of the widest tag
  console.log({ tags, r });
  return r;
});

type File = Record<string, { Tags: string[] }>;
const parsedFile = signal<File>({});

const parseFile = (file: string) => {
  let parsed: File;
  try {
    parsed = parse(file || "") as File;
    console.log(parsed);
    if (!parsed) return null;
  } catch (e) {
    e.file = "file";
    error.value = e;
    return null;
  }
  return parsed;
};

const CheckboxTag = function CheckboxTag(
  props: {
    toggleTag: (tag: string) => void;
    tags: Signal<string[]>;
    tag: string;
  },
) {
  const uuid = useUuid();
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
  props: {
    tags: Signal<string[]>;
    category: string[];
    categoryName: string;
    colSpan: number;
  },
) {
  const showList = useSignal(true);

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
      class="text-sm px-1 text-gray-300"
      colSpan={props.colSpan}
    >
      <div class=" overflow-auto overflow-x-auto h-64">
        <ul>
          {props.category &&
            checked.map((tag) => (
              <CheckboxTag toggleTag={toggleTag} tags={props.tags} tag={tag} />
            ))}
          {unchecked.length > 0 &&
            unchecked.map((tag) => (
              <CheckboxTag toggleTag={toggleTag} tags={props.tags} tag={tag} />
            ))}
        </ul>
      </div>
    </td>
  );
};

const TagCategoryHeader = function TagCategoryHeader(
  props: { categoryName: string },
) {
  const lowercaseCategoryNames = useComputed(() => {
    return parsedTags.value[props.categoryName].map((tag) => tag.toLowerCase());
  });
  console.log(props.categoryName, widestTagCategories.value);
  return (
    <>
      <th
        class="sticky top-0"
        colSpan={widestTagCategories.value.includes(props.categoryName) ? 2 : 1}
      >
        <p>{props.categoryName}</p>
        <InputBox
          isValid={(value) => {
            if (!parsedTags.value) {
              return [false, "No file loaded"];
            }
            if (
              lowercaseCategoryNames.value.indexOf(value.toLowerCase()) > -1
            ) {
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
      {widestTagCategories.value.includes(props.categoryName)
        ? <th></th>
        : <></>}
    </>
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
    <th
      class="sticky top-0"
      colSpan={config.value.item_in_separate_row
        ? Object.keys(parsedTags.value).length + 1
        : 1}
    >
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
        colSpan={widestTagCategories.value.includes(category) ? 2 : 1}
      />
    ));

  const onLeave = () => {
    if (_.isEqual(tags.value, props.f.value[props.name].Tags)) {
      console.log("tags are not different, bye");
      return;
    }
    props.f.value[props.name].Tags = tags.value;
    props.f.value = { ...props.f.value };
    console.log("tags are different, updating");
  };

  return config.value.item_in_separate_row
    ? (
      <>
        <tr class="bg-white align-top ">
          <td colSpan={Object.keys(props.s.value).length + 1}>
            {props.name}
          </td>
        </tr>
        <tr class="hover:bg-gray-300 align-top " onMouseLeave={onLeave}>
          <td></td>
          {rest}
        </tr>
      </>
    )
    : (
      <tr class="hover:bg-gray-300 align-top " onMouseLeave={onLeave}>
        <td class="sticky left-0 bg-white">{props.name}</td>
        {rest}
      </tr>
    );
};

const List = function List() {
  if (!parsedFile.value) return null;
  if (!parsedTags.value) return null;
  console.log("rendering list");

  return (
    <table class="align-top table-fixed">
      <thead>
        {config.value.item_in_separate_row
          ? (
            <>
              <tr class="sticky top-0 bg-white opacity-80 z-10">
                <TagItemHeader />
              </tr>
              <tr class="sticky top-12 mt-5 bg-white opacity-80 z-10">
                <td></td>
                {Object.keys(parsedTags.value).map((category) => (
                  <TagCategoryHeader categoryName={category} />
                ))}
              </tr>
            </>
          )
          : (
            <tr class="sticky top-0 bg-white opacity-80 z-10">
              <TagItemHeader />
              {Object.keys(parsedTags.value).map((category) => (
                <TagCategoryHeader categoryName={category} />
              ))}
            </tr>
          )}
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

const dl = (value: string, fileName: string) => {
  const tempLink = document.createElement("a");
  const taBlob = new Blob([value], { type: "text/plain" });

  tempLink.setAttribute("href", URL.createObjectURL(taBlob));
  tempLink.setAttribute("download", `${fileName.toLowerCase()}`);
  tempLink.click();

  URL.revokeObjectURL(tempLink.href);
};

const Option = function Option(
  props: { key: string; description: string; options?: string[] },
) {
  const uuid = useUuid();
  return (props.options?.length
    ? (
      <>
        <select
          id={uuid}
          onChange={(e) => {
            if (!config.value[props.key]) return;
            config.value[props.key] = e.currentTarget.value;
            config.value = { ...config.value };
          }}
          value={config.value[props.key]}
        >
          {props.options.map((option) => (
            <option value={option}>{option}</option>
          ))}
        </select>
        <label for={uuid} class="ml-2 block text-sm leading-5 text-gray-900">
          {props.description}
        </label>
      </>
    )
    : (
      <>
        <input
          type="checkbox"
          id={uuid}
          class="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
          checked={config.value[props.key] === "true"}
          onChange={() => {
            config.value = {
              ...config.value,
              [props.key]: config.value[props.key] === "false"
                ? "true"
                : "false",
            };
            ls.setItem("config", JSON.stringify(config.value));
          }}
        />
        <label for={uuid} class="ml-2 block text-sm leading-5 text-gray-900">
          {props.description}
        </label>
      </>
    ));
};

export default function Main() {
  const localYamlTags = useSignal("");
  const localYamlFile = useSignal("");

  const triedLoading = useSignal(false);

  useEffect(() => {
    if (triedLoading.value) return;
    triedLoading.value = true;
    localYamlTags.value = ls.getItem("yamlTags") || yamlTags;
    const tags = parseTags(localYamlTags.value);
    if (!tags) {
      console.error("no tags");
      return;
    }
    parsedTags.value = tags;

    localYamlFile.value = ls.getItem("yamlFile") || yamlFile;
    const file = parseFile(localYamlFile.value);
    if (!file) {
      console.error("no file");
      return;
    }
    parsedFile.value = file;

    config.value = JSON.parse(
      ls.getItem("config") || JSON.stringify(config.value),
    );
  }, [triedLoading.value]);

  useEffect(() => {
    const i = setInterval(() => {
      if (Object.keys(parsedTags.value).length > 0) {
        const tags = stringify(parsedTags.value);
        ls.setItem("yamlTags", tags);
        localYamlTags.value = tags;
      }
      if (Object.keys(parsedFile.value).length > 0) {
        const file = stringify(parsedFile.value);
        ls.setItem("yamlFile", file);
        localYamlFile.value = file;
      }
    }, 10000);

    return () => clearInterval(i);
  }, []);

  return (
    <div class="container w-full mx-0 px-0">
      <List />
      {error.value && (
        <div
          class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
          role="alert"
        >
          <strong class="font-bold">Error in yaml {error.value.file}!</strong>
          <span class="block sm:inline">
            <div class="p-4">
              {error.value.mark.buffer.substring(
                error.value.mark.position - 30,
                error.value.mark.position + 30,
              ).split("\n").map((x) => <p>{x}</p>)}
            </div>
            {`line: ${error.value.mark.line}, column: ${error.value.mark.column}`}
          </span>
        </div>
      )}
      <div class="grid grid-flow-col auto-cols-max grid-cols-6">
        <div>
          <h3>Yaml Tags</h3>
          <textarea
            rows={10}
            onChange={(e) => localYamlTags.value = e.currentTarget.value}
          >
            {localYamlTags}
          </textarea>
        </div>
        <div>
          <h3>Yaml File</h3>
          <textarea
            rows={10}
            onChange={(e) => localYamlFile.value = e.currentTarget.value}
          >
            {localYamlFile}
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
            const date = new Date()
              .toISOString()
              .split("")
              .filter((l) => /[0-9]/g.test(l))
              .slice(0, 14)
              .join("");
            dl(stringify(parsedTags.value), `${date}-tags.yaml`);
            dl(stringify(parsedFile.value), `${date}-file.yaml`);
          }}
        >
          Download
        </button>

        <button
          class="py-2 px-3 bg-black text-white text-sm font-semibold rounded-md shadow focus:outline-none"
          onClick={() =>
            navigator.clipboard.writeText(stringify(parsedTags.value))}
        >
          Save tags to clipboard
        </button>
        <button
          class="py-2 px-3 bg-black text-white text-sm font-semibold rounded-md shadow focus:outline-none"
          onClick={() =>
            navigator.clipboard.writeText(stringify(parsedFile.value))}
        >
          Save yaml to clipboard
        </button>
        <Option
          key="item_in_separate_row"
          description="Item label in separate row?"
        />
        <Option
          key="enlarge_categories"
          description="How many categories should have double width?"
          options={["0", "1", "2", "3", "4", "5", "6"]}
        />
      </div>
    </div>
  );
}
