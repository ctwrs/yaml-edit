import { Head } from "$fresh/runtime.ts";
import { yamlTags } from "../data/yamlTags.ts";
import Main from "../islands/Main.tsx";
import Textarea from "../islands/Textarea.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fresh App</title>
      </Head>
      <div class="bg-gray-100 text-gray-900 tracking-wider leading-normal">
        <Main/>
      </div>
    </>
  );
}
