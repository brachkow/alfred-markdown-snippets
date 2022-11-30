import alfy from 'alfy';
import { read } from 'to-vfile';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkStringify from 'remark-stringify';
import yaml from 'js-yaml';
import { readdirSync } from 'node:fs';

const ROOT = process.env.ROOT;

class File {
  constructor(filename) {
    this.filename = filename;
  }

  get path() {
    return ROOT + this.filename;
  }

  get name() {
    return this.filename.replace('.md', '');
  }
}

class Snippet {
  constructor(args) {
    const { name, path, frontmatter, value, lang } = args;
    this.name = name;
    this.path = path;
    this.frontmatter = frontmatter;
    this.value = value;
    this.lang = lang;
  }

  get tags() {
    return this.frontmatter.tags.map((tag) => `#${tag}`).join(' ');
  }
}

const getFiles = () => {
  return readdirSync(ROOT)
    .filter((filename) => filename.match('.md'))
    .map((filename) => new File(filename));
};

const findByType = (tree, type) => {
  return tree.children.find((item) => item.type === type);
};

const getData = async (files) => {
  const data = [];

  await Promise.all(
    files.map(async (file) => {
      return await unified()
        .use(remarkParse)
        .use(remarkStringify)
        .use(remarkFrontmatter, { type: 'yaml', marker: '-' })
        .use(() => (tree) => {
          const name = file.name;
          const path = file.path;
          const frontmatter = yaml.load(findByType(tree, 'yaml').value);
          const value = findByType(tree, 'code').value;
          const lang = findByType(tree, 'code').lang;
          data.push(new Snippet({ name, path, frontmatter, value, lang }));
        })
        .process(await read(file.path));
    }),
  );

  return data;
};

const files = getFiles();
const data = await getData(files);

const items = alfy.inputMatches(data, 'name').map((snippet) => {
  return {
    title: snippet.name,
    subtitle: `written in ${snippet.lang}`,
    uid: snippet.path,
    arg: snippet.value,
    mods: {
      alt: {
        valid: true,
        arg: snippet.path,
        subtitle: 'Open in Finder',
      },
    },
    text: {
      copy: snippet.value,
      largetype: snippet.value,
    },
  };
});

alfy.output(items);
