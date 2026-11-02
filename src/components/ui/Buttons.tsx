// Button
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/shared/utils"
import clsx from 'clsx';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Download,
  Globe,
  ListPlus,
  ListRestart,
  ListX,
  Upload
} from 'lucide-react';

// Button
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

// Button Add
type ButtonAddProps = {
  href: string;
  ariaLabel: string;
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
};

const sizeClasses = {
  xs: 'px-1 py-1 text-xs',
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-3 text-base',
};

const iconSize = {
  xs: 'w-1 h-1',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

const ButtonAdd = ({
  href,
  ariaLabel,
  text,
  size = 'md',
}: ButtonAddProps) => (
  <Button
    asChild
    className={clsx(
      "flex items-center gap-1 rounded-full border",
      text
        ? `bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 ${sizeClasses[size]}`
        : `bg-transparent hover:bg-gray-200 text-gray-800 justify-center border-gray-300 ${size === 'xs'
          ? 'p-0.5 w-6 h-6'
          : size === 'sm'
            ? 'p-1 w-8 h-8'
            : size === 'lg'
              ? 'p-3 w-12 h-12'
              : 'p-2 w-10 h-10'
        }`
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <Link href={href}>
      <ListPlus className={clsx(iconSize[size], "text-gray-500")} />
      {text && <span>{text}</span>}
    </Link>
  </Button>
);

// Button Delete
const ButtonDelete = ({
  onClick,
  ariaLabel,
  text,
}: {
  onClick: () => void;
  ariaLabel: string;
  text?: string;
}) => (
  <Button
    onClick={onClick}
    className={clsx(
      "flex items-center gap-1 rounded-full text-sm border",
      text
        ? "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 px-3 py-2"
        : "p-2 w-10 h-10 bg-transparent hover:bg-gray-200 text-gray-800 justify-center border-gray-300"
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <ListX className="w-5 h-5 text-gray-500" />
    {text && <span>{text}</span>}
  </Button>
);

// Button Download
const ButtonDownload = ({
  onClick,
  ariaLabel,
  text,
  disabled = false,
}: {
  onClick: () => void;
  ariaLabel: string;
  text?: string;
  disabled?: boolean;
}) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "flex items-center gap-1 rounded-full text-sm border transition-all",
      disabled
        ? "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed"
        : text
          ? "bg-primary hover:bg-primary/90 text-white border-gray-200 px-3 py-2"
          : "p-2 w-10 h-10 bg-primary hover:bg-primary/90 text-white justify-center border-gray-200"
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <Download className="w-5 h-5" />
    {text && <span>{text}</span>}
  </Button>
);

// Button Return
const ButtonReturn = ({
  href,
  ariaLabel,
  text,
}: {
  href: string;
  ariaLabel: string;
  text?: string;
}) => {
  return (
    <Button
      asChild
      className={clsx(
        "flex items-center gap-1 rounded-full px-3 py-2 text-sm",
        text
          ? "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 px-3 py-2"
          : "p-2 w-10 h-10 bg-transparent hover:bg-gray-100 text-gray-800 justify-center"
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Link href={href}>
        <ArrowLeft className="w-5 h-5" />
        {text && <span>{text}</span>}
      </Link>
    </Button>
  );
};

// Button Reupload
const ButtonReupload = ({
  href,
  ariaLabel,
  text,
}: {
  href: string;
  ariaLabel: string;
  text?: string;
}) => (
  <Button
    asChild
    className={clsx(
      "flex items-center gap-1 rounded-full text-sm border",
      text
        ? "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 px-3 py-2"
        : "p-2 w-10 h-10 bg-transparent hover:bg-gray-200 text-gray-800 justify-center border-gray-300"
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <Link href={href}>
      <ListRestart className="w-5 h-5 text-gray-500" />
      {text && <span>{text}</span>}
    </Link>
  </Button>
);

// Button Update
const ButtonUpdate = ({
  href,
  ariaLabel,
  text,
  leavePage,
}: {
  href: string;
  ariaLabel: string;
  text?: string;
  leavePage?: boolean; // Optional prop to determine if the button should navigate away
}) => (
  <Button
    asChild
    className={clsx(
      "flex items-center gap-1 rounded-full text-sm border",
      text
        ? "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 px-3 py-2"
        : "p-2 w-10 h-10 bg-transparent hover:bg-gray-200 text-gray-800 justify-center border-gray-300"
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <Link href={href} {...(leavePage ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      <ListRestart className="w-5 h-5 text-gray-500" />
      {text && <span>{text}</span>}
    </Link>
  </Button>
);

// Button Upload
const ButtonUpload = ({
  href,
  ariaLabel,
  text,
}: {
  href: string;
  ariaLabel: string;
  text?: string;
}) => (
  <Button
    asChild
    className={clsx(
      "flex items-center gap-1 rounded-full text-sm border",
      text
        ? "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 px-3 py-2"
        : "p-2 w-10 h-10 bg-transparent hover:bg-gray-200 text-gray-800 justify-center border-gray-300"
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <Link href={href}>
      <Upload className="w-5 h-5 text-gray-500" />
      {text && <span>{text}</span>}
    </Link>
  </Button>
);

// Button Wikidata
const ButtonWikidata = ({
  href,
  ariaLabel,
  text,
  size = 'md',
}: {
  href: string;
  ariaLabel: string;
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) => {
  const fullHref = href.startsWith("https://www.wikidata.org/wiki/")
    ? href
    : `https://www.wikidata.org/wiki/${href}`;

  // Size variants for button dimensions
  const sizeClasses = {
    xs: text ? 'px-2 py-1 text-xs' : 'p-1 w-6 h-6',
    sm: text ? 'px-2.5 py-1.5 text-sm' : 'p-1.5 w-8 h-8',
    md: text ? 'px-3 py-2 text-sm' : 'p-2 w-10 h-10',
    lg: text ? 'px-4 py-2.5 text-base' : 'p-2.5 w-12 h-12',
  };

  // Size variants for logo
  const logoSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Button
      asChild
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border",
        "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300",
        !text && "justify-center",
        sizeClasses[size]
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Link
        href={fullHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/images/logos/Wikidata-logo.svg"
          alt="Wikidata"
          width={20}
          height={20}
          className={logoSizeClasses[size]}
        />
        {text && <span>{text}</span>}
      </Link>
    </Button>
  );
};

// Button Wikipedia
const ButtonWikipedia = ({
  href,
  ariaLabel,
  text,
  size = 'md',
}: {
  href: string;
  ariaLabel: string;
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) => {
  const fullHref = href;

  // Size variants for button dimensions
  const sizeClasses = {
    xs: text ? 'px-2 py-1 text-xs' : 'p-1 w-6 h-6',
    sm: text ? 'px-2.5 py-1.5 text-sm' : 'p-1.5 w-8 h-8',
    md: text ? 'px-3 py-2 text-sm' : 'p-2 w-10 h-10',
    lg: text ? 'px-4 py-2.5 text-base' : 'p-2.5 w-12 h-12',
  };

  // Size variants for logo
  const logoSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Button
      asChild
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border",
        "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300",
        !text && "justify-center",
        sizeClasses[size]
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Link
        href={fullHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/images/logos/Wikipedia-logo.svg"
          alt="Wikipedia"
          width={20}
          height={20}
          className={logoSizeClasses[size]}
        />
        {text && <span>{text}</span>}
      </Link>
    </Button>
  );
};

const ButtonGlobe = ({
  href,
  ariaLabel,
  text,
  size = 'md',
}: ButtonAddProps) => (
  <Button
    asChild
    className={clsx(
      "flex items-center gap-1 rounded-full border",
      text
        ? `bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300 ${sizeClasses[size]}`
        : `bg-transparent hover:bg-gray-200 text-gray-800 justify-center border-gray-300 ${size === 'xs'
          ? 'p-0.5 w-6 h-6'
          : size === 'sm'
            ? 'p-1 w-8 h-8'
            : size === 'lg'
              ? 'p-3 w-12 h-12'
              : 'p-2 w-10 h-10'
        }`
    )}
    aria-label={ariaLabel}
    title={ariaLabel}
  >
    <Link href={href}>
      <Globe className={clsx(iconSize[size], "text-gray-500")} />
      {text && <span>{text}</span>}
    </Link>
  </Button>
);

// Button Party Facts
const ButtonPartyFacts = ({
  href,
  ariaLabel,
  text,
  size = 'md',
}: {
  href: number;              // ← number, not string
  ariaLabel: string;
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) => {
  const fullHref = `https://partyfacts.herokuapp.com/data/partycodes/${href}/`;

  // Size variants for button dimensions
  const sizeClasses = {
    xs: text ? 'px-2 py-1 text-xs' : 'p-1 w-6 h-6',
    sm: text ? 'px-2.5 py-1.5 text-sm' : 'p-1.5 w-8 h-8',
    md: text ? 'px-3 py-2 text-sm' : 'p-2 w-10 h-10',
    lg: text ? 'px-4 py-2.5 text-base' : 'p-2.5 w-12 h-12',
  };

  // Size variants for logo
  const logoSizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Button
      asChild
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border",
        "bg-transparent hover:bg-gray-200 text-gray-800 border-gray-300",
        !text && "justify-center",
        sizeClasses[size]
      )}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Link
        href={fullHref}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/images/logos/partyfacts_logo_square.png"
          alt="Party Facts"
          width={20}
          height={20}
          className={logoSizeClasses[size]}
        />
        {text && <span>{text}</span>}
      </Link>
    </Button>
  );
};

export {
  Button,
  ButtonAdd,
  ButtonDelete,
  ButtonDownload,
  ButtonReturn,
  ButtonReupload,
  ButtonUpdate,
  ButtonUpload,
  ButtonWikidata,
  ButtonWikipedia,
  ButtonGlobe,
  ButtonPartyFacts,
}