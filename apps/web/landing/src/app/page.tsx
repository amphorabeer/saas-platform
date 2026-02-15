"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@saas-platform/ui";
import { Navigation } from "../components/navigation";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";

const defaultModules = [
  {
    name: "სასტუმრო",
    slug: "hotel",
    description: "სრულყოფილი სისტემა სასტუმროების მართვისთვის - ოთახების რეზერვაცია, ჩეკ-ინ/ჩეკ-აუთი, Channel Manager (Booking.com, Airbnb), Facebook Messenger Bot და მეტი",
    icon: "🏨",
  },
  {
    name: "რესტორნი",
    slug: "restaurant",
    description: "რესტორნის მენეჯმენტი - მაგიდების რეზერვაცია, შეკვეთების მართვა, მენიუ და ანალიტიკა",
    icon: "🍽️",
  },
  {
    name: "სილამაზის სალონი",
    slug: "beauty",
    description: "სილამაზის სალონების მართვა - ვიზიტების დაგეგმვა, კლიენტების ბაზა, ფინანსური ანალიტიკა",
    icon: "💅",
  },
  {
    name: "მაღაზია",
    slug: "shop",
    description: "თანამედროვე სალარო სისტემა — POS ტერმინალი, მარაგების მართვა, ფისკალური ინტეგრაცია, RS.ge",
    icon: "🛍️",
  },
  {
    name: "ლუდსახარში",
    slug: "brewery",
    description: "ლუდსახარშის მართვა - წარმოების სრული პროცესი, ავზების რეცხვა, მარაგები, აღჭურვილობა, ფინანსები და გაყიდვები",
    icon: "🍺",
  },
  {
    name: "ღვინის ქარხანა",
    slug: "winery",
    description: "ღვინის ქარხნის მართვა - ვენახების მონიტორინგი, წარმოება, ბარელები და გაყიდვები",
    icon: "🍷",
  },
  {
    name: "დისტილერია",
    slug: "distillery",
    description: "დისტილერიის მართვა - წარმოების პროცესები, ბარელების მართვა, გაყიდვები და ანალიტიკა",
    icon: "🥃",
  },
];

const defaultHeroContent = {
  title: "მოდულები",
  subtitle: "აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული",
  stats: {
    businesses: "436+",
    transactions: "2.5M+",
    users: "12K+",
  },
};

const fadeInUp = {
  initial: { opacity: 0, y: 60 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardAnimation = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

function AnimatedCard({ children, index }: { children: React.ReactNode; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial="initial"
      animate={isInView ? "animate" : "initial"}
      variants={cardAnimation}
      transition={{ delay: index * 0.1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="h-full"
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  // Hardcoded modules - არ იძახებს API-ს
  const modules = defaultModules;
  const heroContent = defaultHeroContent;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="relative container mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial="initial"
            animate="animate"
            variants={fadeInUp}
            className="max-w-4xl mx-auto text-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              SaaS Platform
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-8"
            >
              მრავალმოდულური ბიზნეს მენეჯმენტის პლატფორმა
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="text-base sm:text-lg text-muted-foreground mb-12 max-w-2xl mx-auto px-4"
            >
              ერთი პლატფორმა ყველა ბიზნესისთვის - სასტუმროებიდან რესტორნებამდე, სილამაზის სალონებიდან მაღაზიებამდე
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center px-4"
            >
              <Button size="lg" asChild className="min-h-[44px]">
                <Link href="/auth/signup">დაიწყეთ უფასოდ</Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-[44px]">
                <Link href="#modules">გაიგეთ მეტი</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{heroContent.stats.businesses}</div>
              <div className="text-muted-foreground text-base sm:text-lg">ბიზნესი</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{heroContent.stats.transactions}</div>
              <div className="text-muted-foreground text-base sm:text-lg">ტრანზაქცია</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary mb-2">{heroContent.stats.users}</div>
              <div className="text-muted-foreground text-base sm:text-lg">მომხმარებელი</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section id="modules" className="py-24 container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">{heroContent.title}</h2>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto px-4">
              {heroContent.subtitle}
            </p>
        </motion.div>
        
        {modules.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-4">მოდულები არ მოიძებნა</p>
            <p className="text-sm text-muted-foreground">
              გთხოვთ შეამოწმოთ Super Admin-ში, რომ მოდულები ჩართულია და შენახულია.
            </p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
          >
            {modules.map((module, index) => (
              <AnimatedCard key={module.slug} index={index}>
                <Card className="h-full hover:shadow-lg transition-shadow">
              <CardHeader>
                    <div className="text-4xl mb-4">{module.icon}</div>
                    <CardTitle className="text-xl sm:text-2xl">{module.name}</CardTitle>
                    <CardDescription className="text-sm sm:text-base">{module.description}</CardDescription>
              </CardHeader>
              <CardContent>
                    <Button asChild className="w-full min-h-[44px]">
                      <Link href={`/modules/${module.slug}/pricing`}>გაიგე მეტი</Link>
                    </Button>
              </CardContent>
            </Card>
              </AnimatedCard>
          ))}
          </motion.div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t py-12 mt-24">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 SaaS Platform. ყველა უფლება დაცულია.</p>
        </div>
      </footer>
      </div>
  );
}