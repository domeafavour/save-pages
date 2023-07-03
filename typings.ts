export type ConfigDef = {
  title: string;
  author: string;
  dateTime: string;
  content: {
    selector: string;
    exclude: string[];
  };
};
