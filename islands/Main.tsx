import { lodash as _ } from "lodash";
import { parse, stringify } from "yaml";

import { useEffect, useMemo } from "preact/hooks";
import {
  Signal,
  signal,
  useComputed,
  useSignal,
} from "@preact/signals";

const TAGS_KEY = "yamlTags";
const FILE_KEY = "yamlFile";
const CONFIG_KEY = "config";

let ls: Storage;
if (typeof localStorage !== "undefined") {
  // @ts-ignore we dont use more than get and set
  ls = {
    getItem: (x) => {
      const i = localStorage.getItem(x);
      // console.log('getItem', x, i);
      return i;
    },
    setItem: (x, y) => {
      // console.log('setItem', x, y);
      localStorage.setItem(x, y);
    },
    removeItem: (x) => {
      // console.log('removeItem', x);
      localStorage.removeItem(x);
    },
  };
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

const defaultConfig = {
  item_in_separate_row: "false",
  enlarge_categories: "1",
};

type Config = Record<string, string>;
const config = signal<Config>(defaultConfig);

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

type File = Record<string, { Tags: string[] }>;
const parsedFile = signal<File>({});

const parseFile = (file: string) => {
  let parsed: File;
  try {
    parsed = parse(file || "") as File;
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
  // const uuid = useUuid();
  const checked = props.tags.value.indexOf(props.tag) > -1;
  return (
    <div
      class={`${
        checked ? "bg-green-200 hover:bg-red-300" : "hover:bg-green-300"
      } cursor-pointer border-b-1 border-gray-100 px-1 block text-sm leading-5 text-gray-900`}
      onClick={() => props.toggleTag(props.tag)}
    >
      {props.tag}
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
    <td class="text-sm text-gray-300">
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
  return (
    <>
      <th class="sticky top-0">
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
        class="w-5/6 border-1 h-[24px] border-gray-100 text-indigo-600 transition duration-150 ease-in-out"
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
        class="w-1/6 text-sm text-gray-900 h-[24px] hover:bg-gray-100"
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
      colSpan={config.value.item_in_separate_row === "true"
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
      />
    ));

  const onLeave = () => {
    if (_.isEqual(tags.value, props.f.value[props.name].Tags)) {
      return;
    }
    props.f.value[props.name].Tags = tags.value;
    props.f.value = { ...props.f.value };
  };

  return config.value.item_in_separate_row === "true"
    ? (
      <>
        <tr class="bg-white align-top text-center ">
          <td colSpan={Object.keys(props.s.value).length + 1}>
            {props.name}
          </td>
        </tr>
        <tr
          class="hover:bg-gray-200 bg-gray-100 align-top "
          onMouseLeave={onLeave}
        >
          <td></td>
          {rest}
        </tr>
      </>
    )
    : (
      <tr
        class="hover:bg-gray-200 bg-gray-100 align-top "
        onMouseLeave={onLeave}
      >
        <td class="sticky left-0 bg-white">{props.name}</td>
        {rest}
      </tr>
    );
};

const List = function List() {
  if (
    !parsedFile.value || !parsedTags.value ||
    Object.keys(parsedFile.value).length === 0 ||
    Object.keys(parsedTags.value).length === 0
  ) return <p>Nothing to show. Load data in cfg.</p>;

  return (
    <table class="align-top table-auto w-full p-10">
      <thead>
        {config.value.item_in_separate_row === "true"
          ? (
            <>
              <tr class="sticky top-0 bg-white opacity-90 z-10">
                <TagItemHeader />
              </tr>
              <tr class="sticky top-12 bg-white opacity-90 z-10">
                <td></td>
                {Object.keys(parsedTags.value).map((category) => (
                  <TagCategoryHeader categoryName={category} />
                ))}
              </tr>
            </>
          )
          : (
            <tr class="sticky top-0 bg-white opacity-90 z-10">
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
  props: { name: string; description: string; options?: string[] },
) {
  const uuid = useUuid();
  return (props.options?.length
    ? (
      <div>
        <select
          id={uuid}
          onInput={(e) => {
            if (!config.value[props.name]) return;
            config.value[props.name] = e.currentTarget.value;
            config.value = { ...config.value };
            ls.setItem(CONFIG_KEY, JSON.stringify(config.value));
          }}
          value={config.value[props.name]}
        >
          {props.options.map((option) => (
            <option value={option}>{option}</option>
          ))}
        </select>
        <label for={uuid} class="ml-2 text-sm leading-5 text-gray-900">
          {props.description}
        </label>
      </div>
    )
    : (
      <div>
        <input
          type="checkbox"
          id={uuid}
          class="h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
          checked={config.value[props.name] === "true"}
          onInput={() => {
            if (!config.value[props.name]) return;
            config.value = {
              ...config.value,
              [props.name]: config.value[props.name] === "false"
                ? "true"
                : "false",
            };
            ls.setItem(CONFIG_KEY, JSON.stringify(config.value));
          }}
        />
        <label for={uuid} class="ml-2 text-sm leading-5 text-gray-900">
          {props.description}
        </label>
      </div>
    ));
};

const dlFiles = () => {
  const date = new Date()
    .toISOString()
    .split("")
    .filter((l) => /[0-9]/g.test(l))
    .slice(0, 14)
    .join("");
  const opts = { sortKeys: () => 0 };
  const tagLookup = Object
    .keys(parsedTags.value)
    .reduce(
      (acc, category) => [...acc, ...parsedTags.value[category]],
      [] as string[],
    )
    .reduce(
      (acc, tag, i) => ({ ...acc, [tag]: i }),
      {} as Record<string, number>,
    );
  Object.keys(parsedFile.value).forEach((category) => {
    parsedFile.value[category].Tags.sort((a, b) => tagLookup[a] - tagLookup[b]);
  });
  dl(stringify(parsedFile.value), `${date}-file.yaml`);
  dl(stringify(parsedTags.value, opts), `${date}-tags.yaml`);
};

export default function Main() {
  const localYamlTags = useSignal("");
  const localYamlFile = useSignal("");

  const triedLoading = useSignal(false);

  useEffect(() => {
    console.log("loading config");
    if (triedLoading.value) return;
    triedLoading.value = true;
    localYamlTags.value = ls.getItem(TAGS_KEY) || "";
    const tags = parseTags(localYamlTags.value);
    if (!tags) {
      console.error("no tags");
      return;
    }
    parsedTags.value = tags;

    localYamlFile.value = ls.getItem(FILE_KEY) || "";
    console.log(localYamlFile.value);
    const file = parseFile(localYamlFile.value);
    if (!file) {
      console.error("no file");
      return;
    }
    parsedFile.value = file;

    config.value = JSON.parse(
      ls.getItem(CONFIG_KEY) || JSON.stringify(config.value),
    );
  }, [triedLoading.value]);

  useEffect(() => {
    const i = setInterval(() => {
      if (Object.keys(parsedTags.value).length > 0) {
        const tags = stringify(parsedTags.value);
        ls.setItem(TAGS_KEY, tags);
        // localYamlTags.value = tags;
      }
      if (Object.keys(parsedFile.value).length > 0) {
        const file = stringify(parsedFile.value);
        ls.setItem(FILE_KEY, file);
        // localYamlFile.value = file;
      }
    }, 10000);

    return () => clearInterval(i);
  }, []);

  const showModal = useSignal(false);

  return (
    <>
      <div class="fixed top-0 right-5 z-20">
        <span
          class="hover:underline cursor-pointer text-blue-200 p-1"
          onClick={dlFiles}
        >
          dl
        </span>
        <span
          class="hover:underline cursor-pointer text-blue-200"
          onClick={() => showModal.value = !showModal.value}
        >
          cfg
        </span>
      </div>
      <div class="w-full mx-0 px-0">
        <List />
      </div>
      <div
        tabIndex={-1}
        aria-hidden="true"
        class={`${
          showModal.value ? "" : "hidden"
        } bg-black opacity-95 overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-50 p-4 w-full md:inset-0 md:h-full`}
      >
        <div class="relative bg-white p-8 rounded-lg shadow-lg w-full md:w-3/4 mx-auto h-full md:h-auto">
          <div
            class="p-3 font-bold cursor-pointer absolute right-0 top-0 text-blue-200"
            onClick={() => showModal.value = false}
          >
            ✖
          </div>
          {error.value && (
            <div
              class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
              role="alert"
            >
              <strong class="font-bold">
                Error in yaml {error.value.file}!
              </strong>
              {error.value.mark
                ? (
                  <span class="block sm:inline">
                    <div class="p-4">
                      {error.value.mark.buffer.substring(
                        error.value.mark.position - 30,
                        error.value.mark.position + 30,
                      ).split("\n").map((x) => <p>{x}</p>)}
                    </div>
                    {`line: ${error.value.mark.line}, column: ${error.value.mark.column}`}
                  </span>
                )
                : (
                  <span class="block sm:inline">
                    {JSON.stringify(error.value)}
                  </span>
                )}
            </div>
          )}

          <div class="grid grid-flow-col auto-cols-max grid-cols-2">
            <div class="relative">
              <h3>Yaml Tags</h3>
              <div
                class="mx-2 my-5 hover:underline font-bold cursor-pointer absolute right-0 top-0 text-blue-200"
                onClick={() =>
                  navigator.clipboard.writeText(stringify(parsedTags.value))}
              >
                copy
              </div>
              <textarea
                class="text-[9px] w-full h-96 bg-gray-100"
                onBlur={(e) => {
                  // log('onChange', e.currentTarget.value);
                  localYamlTags.value = e.currentTarget.value;
                }}
                onPaste={(e) => {
                  // console.log('onPaste', e.currentTarget.value);
                  localYamlTags.value = e.currentTarget.value;
                }}
              >
                {localYamlTags.value}
              </textarea>
            </div>
            <div class="relative">
              <h3>Yaml File</h3>
              <div
                class="mx-2 my-5 hover:underline font-bold cursor-pointer absolute right-0 top-0 text-blue-200"
                onClick={() =>
                  navigator.clipboard.writeText(stringify(parsedFile.value))}
              >
                copy
              </div>
              <textarea
                class="text-[9px] w-full h-96 bg-gray-100"
                onBlur={(e) => {
                  // log('onChange', e.currentTarget.value)
                  localYamlFile.value = e.currentTarget.value;
                }}
                onPaste={(e) => {
                  // console.log('onPaste', e.currentTarget.value)
                  localYamlFile.value = e.currentTarget.value;
                }}
              >
                {localYamlFile.value}
              </textarea>
            </div>
          </div>

          <div class="p-3 text-center self-center">
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
              class="py-2 px-3 bg-black hover:bg-red-200 text-white text-sm font-semibold rounded-md shadow focus:outline-none"
              onClick={() => {
                ls.removeItem(TAGS_KEY);
                ls.removeItem(FILE_KEY);
                ls.removeItem(CONFIG_KEY);
                localYamlFile.value = "";
                localYamlTags.value = "";
                parsedTags.value = {};
                parsedFile.value = {};
                config.value = {
                  ...config.value,
                  ...defaultConfig,
                };
              }}
            >
              Nuke ☢️
            </button>

            <Option
              name="item_in_separate_row"
              description="Item label in separate row?"
            />
          </div>
        </div>
      </div>
    </>
  );
}
