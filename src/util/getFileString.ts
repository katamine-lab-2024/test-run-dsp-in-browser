export const getFileString = async (
  files: Record<string, () => Promise<unknown>>,
  replacePath?: string
): Promise<{
  [key: string]: string;
}> => {
  let f: { [key: string]: string } = {};

  const importFiles = async () => {
    const entries = Object.entries(files);
    const filesContent: { [key: string]: string } = {};

    for (const [path, resolver] of entries) {
      const content = await resolver();
      const newPath = replacePath ? path.replace(replacePath, "./") : path;
      filesContent[newPath] = content as string;
    }

    f = filesContent;
  };
  await importFiles();

  return f;
};
