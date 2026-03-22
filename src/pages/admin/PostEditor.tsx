
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";

interface PostFormData {
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  content: string;
  image_url: string;
  is_published: boolean;
}

const PostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<PostFormData>({
    defaultValues: {
      author: "Page4Mentors",
      is_published: false,
    },
  });

  const title = watch("title");

  // Auto-generate slug from title
  useEffect(() => {
    if (title && (!id || id === "new")) {
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
      setValue("slug", slug, { shouldValidate: true, shouldDirty: true });
    }
  }, [title, id, setValue]);

  useEffect(() => {
    const fetchPost = async (postId: string) => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .eq("id", postId)
          .single();
  
        if (error) throw error;
        
        setValue("title", data.title);
        setValue("slug", data.slug);
        setValue("author", data.author || "Page4Mentors");
        setValue("excerpt", data.excerpt || "");
        setValue("content", data.content);
        setValue("image_url", data.image_url || "");
        setValue("is_published", data.is_published);
        
        if (data.image_url) {
          setPreviewUrl(data.image_url);
        }
      } catch (error: any) {
        toast.error("Error fetching post");
        navigate("/admin/dashboard");
      }
    };

    if (id && id !== "new") {
      fetchPost(id);
    }
  }, [id, setValue, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(filePath, imageFile);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage.from("blog-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const onSubmit = async (data: PostFormData) => {
    // Fallback: generate slug from title if still empty
    if (!data.slug && data.title) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "");
    }
    setLoading(true);
    try {
      let imageUrl = data.image_url;

      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) imageUrl = uploadedUrl;
      }

      const postData = {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        author: data.author,
        image_url: imageUrl,
        is_published: data.is_published,
        updated_at: new Date().toISOString(),
      };

      if (id && id !== "new") {
        const { error } = await supabase
          .from("posts")
          .update(postData)
          .eq("id", id);
        if (error) throw error;
        toast.success("Post updated successfully");
      } else {
        const { error } = await supabase.from("posts").insert([postData]);
        if (error) throw error;
        toast.success("Post created successfully");
      }

      navigate("/admin/dashboard");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/admin/dashboard")} className="mb-6 pl-0 hover:bg-transparent">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        <h1 className="text-3xl font-serif font-bold mb-8">
          {id === "new" ? "Create New Post" : "Edit Post"}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register("title", { required: "Title is required" })} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="slug">Slug (URL-friendly identifier)</Label>
              <Input
                id="slug"
                {...register("slug", { required: "Slug is required" })}
                placeholder="auto-generated-from-title"
              />
              {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="author">Author</Label>
              <Select 
                onValueChange={(value) => setValue("author", value)} 
                defaultValue={watch("author") || "Dr. Nandini Shekhar"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dr. Nandini Shekhar">Dr. Nandini Shekhar</SelectItem>
                  <SelectItem value="K. Sreedevi">K. Sreedevi</SelectItem>
                  <SelectItem value="Vartikka Arya">Vartikka Arya</SelectItem>
                  <SelectItem value="Swathi Vanka">Swathi Vanka</SelectItem>
                  <SelectItem value="Page4Mentors">Page4Mentors</SelectItem>
                </SelectContent>
              </Select>
            </div>



            <div className="grid gap-2">
              <Label htmlFor="excerpt">Excerpt (Short description)</Label>
              <Textarea id="excerpt" {...register("excerpt")} rows={3} />
            </div>

            <div className="grid gap-2">
              <Label>Featured Image</Label>
              <div className="flex items-center gap-4">
                {previewUrl && (
                  <div className="relative w-32 h-20 rounded-md overflow-hidden border border-border">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        setPreviewUrl("");
                        setValue("image_url", "");
                      }}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex-1">
                  <Label htmlFor="image" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2 w-full">
                    <Upload className="w-4 h-4 mr-2" /> Upload Image
                    <input
                      id="image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="content">Content (Markdown supported)</Label>
              <Textarea 
                id="content" 
                {...register("content", { required: "Content is required" })} 
                className="min-h-[400px] font-mono text-sm leading-6" 
                placeholder="# Heading\n\nParagraph text...\n\n- List item"
              />
              {errors.content && <p className="text-sm text-destructive">{errors.content.message}</p>}
            </div>

            <div className="flex items-center gap-2 border p-4 rounded-md bg-muted/20">
              <Switch 
                id="published" 
                checked={watch("is_published")}
                onCheckedChange={(checked) => setValue("is_published", checked)}
              />
              <Label htmlFor="published" className="cursor-pointer">
                Publish this post?
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate("/admin/dashboard")}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Post"}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default PostEditor;
