import { getTranslations } from "next-intl/server";
import { listNews } from "@/lib/admin/news/queries";
import { NewsCreateForm } from "./NewsCreateForm";
import { NewsRowEditor } from "./NewsRowEditor";

// News section body: a create form on top, then the existing posts (newest
// first), each editable/deletable in place. The big "News" heading is rendered
// by the shell (AdminSectionHeading) from the section key, so this only carries
// the two sub-blocks. Server component — fetches the list; the form and rows are
// client and drive the server actions.
export async function NewsEditor() {
  const posts = await listNews();
  const t = await getTranslations("Admin");

  return (
    <section className="p-3 max-md:px-2 pb-10 max-w-[760px] flex flex-col gap-6 text-[12px]">
      {/* create */}
      <div>
        <h3 className="text-lg font-bold leading-tight mb-2">{t("news.newPost")}</h3>
        <NewsCreateForm />
      </div>

      {/* existing posts */}
      <div>
        <h3 className="text-lg font-bold leading-tight mb-2">{t("news.existing")}</h3>
        {posts.length === 0 ? (
          <p className="text-foreground-muted">{t("news.empty")}</p>
        ) : (
          <ul className="flex flex-col gap-3 max-w-[520px]">
            {posts.map((post) => (
              <li key={post.id}>
                <NewsRowEditor
                  id={post.id}
                  publishedOn={post.published_on}
                  title={post.title}
                  body={post.body}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
