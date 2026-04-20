import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LibraryCategoryRedirect({ params }: Props) {
  const { slug } = await params;
  redirect(`/explore/category/${slug}`);
}
