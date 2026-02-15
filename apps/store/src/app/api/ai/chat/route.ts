import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  getDashboardStats,
  getSalesReport,
  getTopProducts,
  getLowStockProducts,
  getProducts,
  getInventoryValue,
  getCustomerById,
  getCustomers,
} from "@/lib/store-actions";

const SYSTEM_PROMPT = `შენ ხარ Store POS სისტემის AI ასისტენტი. ეხმარები მომხმარებელს მაღაზიის მართვის ყველა საკითხში. ყოველთვის უპასუხე ქართულად.

=== სისტემის მოდულები ===

1. დეშბორდი (/dashboard): სტატისტიკა — დღის გაყიდვები, რაოდენობა, საშუალო ჩეკი, მოგება. გრაფიკები — ტრენდი, საათობრივი, კატეგორიები, Top პროდუქტები.

2. POS ტერმინალი (/pos): გაყიდვის პროცესი — პროდუქტის არჩევა (გრიდი/ძიება/ბარკოდი) → კალათა → ფასდაკლება (5%/10%/custom) → გადახდა (ნაღდი/ბარათი). კლავიატურა: F1-F8 კატეგორიები, F9 ძიება, F10 გადახდა, Escape გაუქმება. ბარკოდი: USB სკანერი, კამერა ან ხელით. ოფლაინ: მუშაობს ინტერნეტის გარეშე, სინქრონიზდება ავტომატურად.

3. პროდუქტები (/products): სია, შექმნა, რედაქტირება, ძიება, ფილტრი. ფასები: ღირებულება (შესყიდვა), ფასი (გაყიდვა), საბითუმო. SKU ავტოგენერაცია. ბარკოდი. ფასის ისტორია. CSV ექსპორტი.

4. კატეგორიები (/products/categories): შექმნა, რედაქტირება, ქვეკატეგორიები (parentId). POS-ში tab-ებად ჩანს.

5. მარაგები (/inventory): მიმოხილვა, კორექტირება (მიღება/დანაკარგი/დაზიანება), მოძრაობის ისტორია, დაბალი მარაგის შეტყობინებები, ინვენტარიზაცია (Stock Take), ფილიალებს შორის ტრანსფერი.

6. მომწოდებლები (/purchases/suppliers): შექმნა, რედაქტირება, შესყიდვების ისტორია.

7. შესყიდვები (/purchases): შეკვეთის შექმნა (მომწოდებელი + პროდუქტები), სტატუსი (DRAFT→ORDERED→RECEIVED), საქონლის მიღება → მარაგი ავტომატურად იზრდება.

8. მომხმარებლები (/customers): ბაზა, შესყიდვების ისტორია, ლოიალობის ქულები. ლოიალობა: ქულების rate, გამოყენების rate, Tier-ები (Bronze/Silver/Gold/Platinum).

9. გაყიდვები (/sales): ისტორია, დეტალები, გაუქმება (void → მარაგი აღდგება). დაბრუნებები (/sales/returns): პროდუქტის დაბრუნება → მარაგი აღდგება.

10. რეპორტები (/reports): გაყიდვების, მოგების, მარაგების, თანამშრომლების რეპორტი. Z რეპორტი — ცვლის დახურვის ანგარიში.

11. პარამეტრები (/settings): მაღაზია, საგადასახადო წესები, გადახდის მეთოდები, ჩეკის შაბლონი, თანამშრომლები (როლები: OWNER/MANAGER/CASHIER/INVENTORY, PIN კოდი), აპარატურა, ფილიალები, ლოიალობა, ინტეგრაციები (RS.ge).

12. იმპორტი (/settings/import): CSV/Excel — პროდუქტები, მომხმარებლები, მომწოდებლები, კატეგორიები.

=== ხშირი კითხვები ===
- ფასის შეცვლა: პროდუქტები → რედაქტირება → ფასი → შენახვა
- გაყიდვის გაუქმება: გაყიდვები → დეტალები → გაუქმება
- ახალი თანამშრომელი: პარამეტრები → თანამშრომლები → ახალი (+ PIN)
- Z რეპორტი: POS → ცვლის დახურვა, ან რეპორტები → Z რეპორტი
- მარაგის შემოწმება: მარაგები → მიმოხილვა
- ექსპორტი: პროდუქტების/გაყიდვების სიაში CSV ღილაკი`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_sales_summary",
    description:
      "გაყიდვების სტატისტიკა მოცემული პერიოდისთვის. dateFrom და dateTo არის ISO თარიღი (YYYY-MM-DD).",
    input_schema: {
      type: "object" as const,
      properties: {
        dateFrom: { type: "string", description: "დაწყების თარიღი ISO ფორმატში" },
        dateTo: { type: "string", description: "დასრულების თარიღი ISO ფორმატში" },
      },
      required: ["dateFrom", "dateTo"],
    },
  },
  {
    name: "get_top_products",
    description: "ტოპ პროდუქტები გაყიდვების მიხედვით (შემოსავალი ან რაოდენობა).",
    input_schema: {
      type: "object" as const,
      properties: {
        sortBy: {
          type: "string",
          enum: ["revenue", "quantity"],
          description: "დახარისხება შემოსავლით თუ რაოდენობით",
        },
        limit: { type: "number", description: "რაოდენობა (ნაგულისხმევი 10)", default: 10 },
      },
    },
  },
  {
    name: "get_low_stock",
    description: "დაბალი მარაგის პროდუქტები (მინიმალურ მარაგზე ნაკლები).",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_product_info",
    description:
      "პროდუქტის ძიება სახელით, SKU-ით ან ბარკოდით. query არის საძიებო ტექსტი.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "პროდუქტის სახელი, SKU ან ბარკოდი" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_inventory_value",
    description: "მარაგის ღირებულება (ღირებულებით და საცალო ფასით).",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_daily_report",
    description:
      "დღის ანგარიში: გაყიდვები, ტრანზაქციები, საშუალო ჩეკი დღევანდელი თარიღისთვის.",
    input_schema: { type: "object" as const, properties: {} },
  },
  {
    name: "get_customer_info",
    description:
      "მომხმარებლის ინფო და შესყიდვების ისტორია. მოგვცით customerId ან search (სახელი/ტელეფონი).",
    input_schema: {
      type: "object" as const,
      properties: {
        customerId: { type: "string", description: "მომხმარებლის ID" },
        search: { type: "string", description: "ძიება სახელით ან ტელეფონით" },
      },
    },
  },
  {
    name: "generate_purchase_suggestion",
    description: "შესყიდვის რეკომენდაცია დაბალი მარაგის პროდუქტების მიხედვით.",
    input_schema: { type: "object" as const, properties: {} },
  },
];

async function runTool(
  name: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "get_sales_summary": {
        const report = await getSalesReport({
          dateFrom: input.dateFrom as string,
          dateTo: input.dateTo as string,
        });
        return JSON.stringify(
          {
            dateFrom: report.dateFrom,
            dateTo: report.dateTo,
            totalRevenue: report.totalRevenue,
            transactionCount: report.transactionCount,
          },
          null,
          2
        );
      }
      case "get_top_products": {
        const products = await getTopProducts({
          sortBy: (input.sortBy as "revenue" | "quantity") ?? "revenue",
          limit: (input.limit as number) ?? 10,
        });
        return JSON.stringify(products, null, 2);
      }
      case "get_low_stock": {
        const products = await getLowStockProducts();
        return JSON.stringify(
          products.map((p: { name: string; nameKa: string | null; sku: string; currentStock: number; minStock: number }) => ({
            name: p.nameKa || p.name,
            sku: p.sku,
            currentStock: p.currentStock,
            minStock: p.minStock,
          })),
          null,
          2
        );
      }
      case "get_product_info": {
        const q = (input.query as string)?.trim();
        if (!q) return JSON.stringify({ error: "ძიების ტექსტი აუცილებელია" });
        const { products } = await getProducts({ search: q, limit: 5 });
        if (products.length === 0) return JSON.stringify({ message: "პროდუქტი ვერ მოიძებნა" });
        return JSON.stringify(
          products.map((p: { name: string; nameKa: string | null; sku: string; barcode: string | null; currentStock: number; minStock: number }) => ({
            name: p.nameKa || p.name,
            sku: p.sku,
            barcode: p.barcode,
            currentStock: p.currentStock,
            minStock: p.minStock,
          })),
          null,
          2
        );
      }
      case "get_inventory_value": {
        const val = await getInventoryValue();
        return JSON.stringify(val, null, 2);
      }
      case "get_daily_report": {
        const stats = await getDashboardStats();
        return JSON.stringify(stats, null, 2);
      }
      case "get_customer_info": {
        const customerId = input.customerId as string | undefined;
        const search = (input.search as string)?.trim();
        if (customerId) {
          const c = await getCustomerById(customerId);
          if (!c) return JSON.stringify({ error: "მომხმარებელი ვერ მოიძებნა" });
          return JSON.stringify(
            {
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
              totalPurchases: c.totalPurchases,
              sales: c.sales.slice(0, 10),
            },
            null,
            2
          );
        }
        if (search) {
          const { customers } = await getCustomers({ search, limit: 5 });
          if (customers.length === 0)
            return JSON.stringify({ message: "მომხმარებელი ვერ მოიძებნა" });
          const c = await getCustomerById(customers[0]!.id);
          if (!c) return JSON.stringify({ error: "მომხმარებელი ვერ მოიძებნა" });
          return JSON.stringify(
            {
              firstName: c.firstName,
              lastName: c.lastName,
              phone: c.phone,
              totalPurchases: c.totalPurchases,
              sales: c.sales.slice(0, 10),
            },
            null,
            2
          );
        }
        return JSON.stringify({ error: "მოგვცით customerId ან search" });
      }
      case "generate_purchase_suggestion": {
        const products = await getLowStockProducts();
        const suggestion = products.map((p: { name: string; nameKa: string | null; sku: string; currentStock: number; minStock: number }) => ({
          name: p.nameKa || p.name,
          sku: p.sku,
          currentStock: p.currentStock,
          minStock: p.minStock,
          suggestedOrder: Math.max(0, p.minStock - p.currentStock),
        }));
        return JSON.stringify(
          { products: suggestion, message: "დაბალი მარაგის პროდუქტების შესყიდვის რეკომენდაცია" },
          null,
          2
        );
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (e) {
    return JSON.stringify({
      error: e instanceof Error ? e.message : "შეცდომა ხელსაწყოს შესრულებისას",
    });
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      { error: "AI ასისტენტი არ არის კონფიგურირებული" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { messages: rawMessages } = body as { messages?: { role: string; content: string }[] };
    const messages: Anthropic.MessageParam[] = (rawMessages ?? []).map(
      (m: { role: string; content: string }) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      })
    );

    if (messages.length === 0) {
      return NextResponse.json({ error: "შეკითხვა აუცილებელია" }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey });

    let currentMessages = [...messages];
    let maxIterations = 5;

    while (maxIterations-- > 0) {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: currentMessages,
        tools: TOOLS,
        tool_choice: { type: "auto" },
      });

      const textBlocks = response.content.filter((b) => b.type === "text");
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      if (toolUseBlocks.length === 0) {
        const text = textBlocks.map((b) => (b as Anthropic.TextBlock).text).join("\n");
        return NextResponse.json({ content: text || "პასუხი ვერ მოვიძე." });
      }

      const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
        toolUseBlocks.map(async (block: Anthropic.ToolUseBlock) => ({
          type: "tool_result" as const,
          tool_use_id: block.id,
          content: await runTool(block.name, (block.input as Record<string, unknown>) ?? {}),
        }))
      );

      currentMessages = [
        ...currentMessages,
        {
          role: "assistant" as const,
          content: response.content,
        },
        {
          role: "user" as const,
          content: toolResults,
        },
      ];
    }

    return NextResponse.json({
      content: "მაქსიმალური იტერაციები გადაღებულია. გთხოვთ სცადოთ თავიდან.",
    });
  } catch (e) {
    console.error("AI chat error:", e);
    const msg = e instanceof Error ? e.message : "უცნობი შეცდომა";
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
