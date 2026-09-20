(function ($) {
  "use strict";
  
  // ==========================================
  //      Start Document Ready function
  // ==========================================
  $(document).ready(function () {
    
  // ============== Mobile Menu Sidebar & Offcanvas Js Start ========
  $('.toggle-mobileMenu').on('click', function () {
    $('.mobile-menu').addClass('active');
    $('.side-overlay').addClass('show');
    $('body').addClass('scroll-hide-sm');
  }); 

  $('.close-button, .side-overlay').on('click', function () {
    $('.mobile-menu').removeClass('active');
    $('.side-overlay').removeClass('show');
    $('body').removeClass('scroll-hide-sm');
  }); 
  // ============== Mobile Menu Sidebar & Offcanvas Js End ========
  
  // ============== Mobile Nav Menu Dropdown Js Start =======================
  var windowWidth = $(window).width(); 
  
  $('.has-submenu').on('click', function () {
    var thisItem = $(this); 
    
    if(windowWidth < 992) {
      if(thisItem.hasClass('active')) {
        thisItem.removeClass('active')
      } else {
        $('.has-submenu').removeClass('active')
        $(thisItem).addClass('active')
      }
      
      var submenu = thisItem.find('.nav-submenu');
      
      $('.nav-submenu').not(submenu).slideUp(300);
      submenu.slideToggle(300);
    }
    
  });
  // ============== Mobile Nav Menu Dropdown Js End =======================
    
  // ===================== Scroll Back to Top Js Start ======================
  var progressPath = document.querySelector('.progress-wrap path');
  var pathLength = progressPath.getTotalLength();
  progressPath.style.transition = progressPath.style.WebkitTransition = 'none';
  progressPath.style.strokeDasharray = pathLength + ' ' + pathLength;
  progressPath.style.strokeDashoffset = pathLength;
  progressPath.getBoundingClientRect();
  progressPath.style.transition = progressPath.style.WebkitTransition = 'stroke-dashoffset 10ms linear';
  var updateProgress = function () {
    var scroll = $(window).scrollTop();
    var height = $(document).height() - $(window).height();
    var progress = pathLength - (scroll * pathLength / height);
    progressPath.style.strokeDashoffset = progress;
  }
  updateProgress();
  $(window).scroll(updateProgress);
  var offset = 50;
  var duration = 550;
  jQuery(window).on('scroll', function() {
    if (jQuery(this).scrollTop() > offset) {
      jQuery('.progress-wrap').addClass('active-progress');
    } else {
      jQuery('.progress-wrap').removeClass('active-progress');
    }
  });
  jQuery('.progress-wrap').on('click', function(event) {
    event.preventDefault();
    jQuery('html, body').animate({scrollTop: 0}, duration);
    return false;
  })
  // ===================== Scroll Back to Top Js End ======================

  // ========================== add active class to ul>li top Active current page Js Start =====================
function dynamicActiveMenuClass(selector) {
  let FileName = window.location.pathname.split("/").reverse()[0];

  // If we are at the root path ("/" or no file name), keep the activePage class on the Home item
  if (FileName === "" || FileName === "index.html") {
    // Keep the activePage class on the Home link
    selector.find("li.nav-menu__item.has-submenu").eq(0).addClass("activePage");
  } else {
    // Remove activePage class from all items first
    selector.find("li").removeClass("activePage");

    // Add activePage class to the correct li based on the current URL
    selector.find("li").each(function () {
      let anchor = $(this).find("a");
      if ($(anchor).attr("href") == FileName) {
        $(this).addClass("activePage");
      }
    });

    // If any li has activePage element, add class to its parent li
    selector.children("li").each(function () {
      if ($(this).find(".activePage").length) {
        $(this).addClass("activePage");
      }
    });
  }
}

if ($('ul').length) {
  dynamicActiveMenuClass($('ul'));
}
  // ========================== add active class to ul>li top Active current page Js End =====================

    
  // ========================== Select2 Js Start =================================
  $(document).ready(function() {
    $('.js-example-basic-single').select2();
  });
  // ========================== Select2 Js End =================================
  
  // ========================= Brand Slider Js Start ==============
  $('.brand-slider').slick({
    slidesToShow: 7,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: false,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#brand-next',
    prevArrow: '#brand-prev',
    responsive: [
      {
        breakpoint: 1399,
        settings: {
          slidesToShow: 6,
          arrows: false,
        }
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 5,
          arrows: false,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 4,
          arrows: false,
        }
      },
      {
        breakpoint: 424,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 359,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Brand Slider Js End ===================
  
  // ========================= Brand Slider Js Start ==============
  $('.features-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#features-next',
    prevArrow: '#features-prev',
    responsive: [
      {
        breakpoint: 991,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Brand Slider Js End ===================

  // ========================= Wishlist Button Js Start ===================
  $('.wishlist-btn').on('click', function () {
    $(this).removeClass('text-main-two-600'); 
    $(this).toggleClass('text-white bg-main-two-600'); 
  })
  // ========================= Wishlist Button Js End ===================
  
  // ========================= Instructor Button Js Start ===================
  $('.social-infos .social-infos__button').on('click', function () {
    $('.social-list').not($(this).siblings('.social-list')).removeClass('d-flex'); 
    $('.social-infos .social-infos__button').not($(this)).removeClass('active'); 
    $(this).siblings('.social-list').toggleClass('d-flex'); 
    $(this).toggleClass('active'); 
  });
  // ========================= Instructor Button Js End ===================

  // ========================= Brand Slider Js Start ==============
  $('.instructor-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#instructor-next',
    prevArrow: '#instructor-prev',
    responsive: [
      {
        breakpoint: 1299,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Brand Slider Js End ===================

   // =========================Testimonials Slider Js Start ===================
   $('.testimonials__thumbs-slider').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: false,
    fade: true,
    asNavFor: '.testimonials__slider'
  });

  $('.testimonials__slider').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    asNavFor: '.testimonials__thumbs-slider',
    dots: false,
    arrows: true,
    focusOnSelect: true,
    nextArrow: '#testimonials-next',
    prevArrow: '#testimonials-prev',
  });
  // =========================Testimonials Slider Js End ===================

  
  // ========================= magnific Popup Js Start =====================
  $('.play-button').magnificPopup({
    type:'iframe'
  });
  // ========================= magnific Popup Js End =====================
  

   // ========================= Counter Up Js End ===================
   const counterUp = window.counterUp.default;

   const callback = (entries) => {
     entries.forEach((entry) => {
       const el = entry.target;
       if (entry.isIntersecting && !el.classList.contains('is-visible')) {
         counterUp(el, {
           duration: 2000,
           delay: 16,
         });
         el.classList.add('is-visible');
       }
     });
   };
 
   const IO = new IntersectionObserver(callback, { threshold: 1 });
 
   // Counter Two for each
   const counterNumbers = document.querySelectorAll('.counter');
   if (counterNumbers.length > 0) {
     counterNumbers.forEach((counterNumber) => {
       IO.observe(counterNumber);
     });
   }

  // ========================= Brand Slider Js Start ==============
  $('.category-item-slider').slick({
    slidesToShow: 4,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#category-next',
    prevArrow: '#category-prev',
    responsive: [
      {
        breakpoint: 1199,
        settings: {
          slidesToShow: 3,
          arrows: false,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Brand Slider Js End ===================

  // ========================= Testimonials Slider Two Js Start ==============
  $('.testimonials-two-slider').slick({
    slidesToShow: 2,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#testimonials-two-next',
    prevArrow: '#testimonials-two-prev',
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Testimonials Slider Two Js End ===================
  
  // ========================= Background Image Js Start ===================
    $(".background-img").css('background-image', function () {
      var bg = 'url(' + $(this).data("background-image") + ')';
      return bg;
    });
  // ========================= Background Image Js End ===================
  
  // ========================= Testimonials Slider Two Js Start ==============
  $('.banner-three__slider').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    fade: true,
    nextArrow: '#banner-three-next',
    prevArrow: '#banner-three-prev',
  });

  $('.banner-three__slider').on('beforeChange', function(event, slick, currentSlide, nextSlide) {
    $('.wow').css('visibility', 'hidden').removeClass('animated'); 
  });

  $('.banner-three__slider').on('afterChange', function(event, slick, currentSlide) {
    new WOW().init();
    $('.wow').css('visibility', 'visible'); 
  });
// ========================= Testimonials Slider Two Js End ===================

  // ========================= Testimonials Slider Two Js End ===================
  
  // ========================= Testimonials Slider Two Js Start ==============
  $('.testimonials-three-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    centerMode: true,
    centerPadding: '0px',
    nextArrow: '#testimonials-three-next',
    prevArrow: '#testimonials-three-prev',
    responsive: [
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Testimonials Slider Two Js End ===================

  // ========================= Brand Slider Js Start ==============
  $('.article-two-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#article-two-next',
    prevArrow: '#article-two-prev',
    responsive: [
      {
        breakpoint: 1299,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Brand Slider Js End ===================

  // ========================== Range Slider Js Start =====================
   $(function() {
    $( "#slider-range" ).slider({
        range: true,
        min: 0,
        max: 1000,
        values: [ 100, 1000 ],
        slide: function( event, ui ) {
            $( "#amount" ).val( "$" + ui.values[ 0 ] + " - $" + ui.values[ 1 ] );
        }
    });
    $( "#amount" ).val( "$" + $( "#slider-range" ).slider( "values", 0 ) +
    " - $" + $( "#slider-range" ).slider( "values", 1 ) );
  });
  
  // ========================== Course List filter bar btn start ================================
  $('.list-bar-btn').on('click', function () {
    $('.sidebar').addClass('active');
    $('.side-overlay').addClass('show');
  });

  $('.sidebar-close, .side-overlay').on('click', function () {
    $('.sidebar').removeClass('active');
    $('.side-overlay').removeClass('show');
  });
  // ========================== Course List filter bar btn End ================================

  // ========================== Tooltip Start ================================
  const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]')
  const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl))
  // ========================== Tooltip Start End ================================

  // ================== Password Show Hide Js Start ==========
  $(".toggle-password").on('click', function() {
    $(this).toggleClass("active");
    var input = $($(this).attr("id"));
    if (input.attr("type") == "password") {
      input.attr("type", "text");
      $(this).removeClass('ph-bold ph-eye-closed');
      $(this).addClass('ph-bold ph-eye');
    } else {
      input.attr("type", "password");
        $(this).addClass('ph-bold ph-eye-closed');
    }
  });
  // ========================= Password Show Hide Js End ===========================
  
  // ========================= Player Js Start ===========================
    const player = new Plyr('#player');
    const featuredPlayer = new Plyr('#featuredPlayer');
  // ========================= Player Js End ===========================
  
  // ========================= Brand Slider Js Start ==============
  $('.tutor-slider').slick({
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: false,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#tutor-next',
    prevArrow: '#tutor-prev',
    responsive: [
      {
        breakpoint: 1299,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 767,
        settings: {
          slidesToShow: 2,
          arrows: false,
        }
      },
      {
        breakpoint: 575,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Brand Slider Js End ===================

  // ========================= Increment & Decrement Js Start ===================
  var minus = $('.quantity__minus');
  var plus = $('.quantity__plus');

  $(plus).on('click', function () {
    var input = $(this).siblings('.quantity__input');
    var value = input.val(); 
    value++;
    input.val(value); 
  }); 

  $(minus).on('click', function () {
    var input = $(this).siblings('.quantity__input');
    var value = input.val(); 
    if(value > 1) {
      value--;
    }
    input.val(value); 
  }); 
  // ========================= Increment & Decrement Js End ===================
  
  // ========================= Review Js Start ==============
  $('.review-slider, .review-slider-two').slick({
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: false,
    autoplaySpeed: 2000,
    speed: 1500,
    dots: true,
    pauseOnHover: true,
    arrows: true,
    draggable: true,
    rtl: $('html').attr('dir') === 'rtl' ? true : false,
    speed: 900,
    infinite: true,
    nextArrow: '#review-slider-next',
    prevArrow: '#review-slider-prev',
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          arrows: false,
        }
      },
    ]
  });  
  // ========================= Review Js End ===================

  // ========================= Wow Js Start ===================
  new WOW().init();
  // ========================= Wow Js End ===================

  // ========================= AOS Animation Js Start ===================
  AOS.init({
    offset: 40,
    duration: 1000,
    // once: true,
    easing: 'ease',
  });
  // ========================= AOS Animation Js End ===================

  $('.masonry__image').magnificPopup({
    type: 'image',
    gallery:{
      enabled:true
    }
  });

    // ========================= Color List Js Start ===================
    $('.color-list__button').on('click', function () {
      $('.color-list__button').removeClass('active'); 
  
      if(!$(this).hasClass('active')) {
        $(this).addClass('active');
        $(this).removeClass('border-neutral-50');
      } else {
        $(this).removeClass('active');
        $(this).addClass('border-neutral-50');
      };
    }); 
    // ========================= Color List Js End ===================
    
    // ========================= Product Details Slider Js Start ===================
    
    $('.product-big-thumbs').slick({
      slidesToShow: 1,
      slidesToScroll: 1,
      arrows: false,
      dots: false,
      fade: true,
      asNavFor: '.product-small-thumbs'
    });
    $('.product-small-thumbs').slick({
      slidesToShow: 4,
      slidesToScroll: 1,
      asNavFor: '.product-big-thumbs',
      arrows: false,
      dots: false,
      autoplay: false,
      centerMode: true,
      responsive: [
        {
          breakpoint: 575,
          settings: {
            slidesToShow: 3,
          }
        },
        {
          breakpoint: 424,
          settings: {
            slidesToShow: 2,
          }
        },
      ]
    });
    // ========================= Product Details Slider Js End ===================

    // ========================= Add To Cart Js Start ===================
    $('.add-to-cart').on('click', function () {
      $(this).toggleClass('active')
    });
    // ========================= Add To Cart Js End ===================
  

  });
  // ==========================================
  //      End Document Ready function
  // ==========================================

  // ========================= Preloader Js Start =====================
    // $(window).on("load", function(){
      
    // })
    // ========================= Preloader Js End=====================

    // ========================= Header Sticky Js Start ==============
    $(window).on('scroll', function() {
      if ($(window).scrollTop() >= 260) {
        $('.header').addClass('fixed-header');
      }
      else {
          $('.header').removeClass('fixed-header');
      }
    }); 
    // ========================= Header Sticky Js End===================

})(jQuery);

// Disable right-click
// document.addEventListener('contextmenu', function (event) {
//   event.preventDefault();
//   alert('Right-click is disabled on this page.');
// });

// Completely disable copying without affecting clipboard
document.addEventListener('copy', function (event) {
  event.preventDefault(); // Prevent the default copy action
  // Clear any data being copied
  if (event.clipboardData) {
    event.clipboardData.clearData();
  }
  alert('Copying content is not allowed.');
});

// Disable "Ctrl+U" and other key combinations
document.addEventListener('keydown', function (event) {
  // Check for "Ctrl+U" (or "Cmd+U" on Mac)
  if (event.ctrlKey && event.key === 'u' || event.metaKey && event.key === 'u') {
    event.preventDefault();
    alert('Viewing the source code is disabled.');
  }
  // Check for "Ctrl+Shift+I" (Developer Tools)
  if (event.ctrlKey && event.shiftKey && event.key === 'I' || event.metaKey && event.shiftKey && event.key === 'I') {
    event.preventDefault();
    alert('Developer Tools are disabled.');
  }
  // Check for "Ctrl+Shift+J" (Console)
  if (event.ctrlKey && event.shiftKey && event.key === 'J' || event.metaKey && event.shiftKey && event.key === 'J') {
    event.preventDefault();
    alert('Developer Tools are disabled.');
  }
  // Check for "Ctrl+Shift+C" (Element Inspector)
  if (event.ctrlKey && event.shiftKey && event.key === 'C' || event.metaKey && event.shiftKey && event.key === 'C') {
    event.preventDefault();
    alert('Element Inspector is disabled.');
  }
  // Check for "F12" (Developer Tools)
  if (event.key === 'F12') {
    event.preventDefault();
    alert('Developer Tools are disabled.');
  }
});
let hide = false;
class TranslationCache {
  constructor() {
      this.cache = new Map();
  }

  getKey(text, lang) {
      return `${text}_${lang}`;
  }

  get(text, lang) {
      return this.cache.get(this.getKey(text, lang));
  }

  set(text, lang, translation) {
      this.cache.set(this.getKey(text, lang), translation);
  }
}

const cache = new TranslationCache();

class TranslationWorkerPool {
  constructor(size = 3) {
      this.queue = [];
      this.activeWorkers = 0;
      this.maxWorkers = size;
  }

  async addTask(task) {
      return new Promise((resolve, reject) => {
          this.queue.push({ task, resolve, reject });
          this.processQueue();
      });
  }

  async processQueue() {
      if (this.activeWorkers >= this.maxWorkers || this.queue.length === 0) return;

      const { task, resolve, reject } = this.queue.shift();
      this.activeWorkers++;

      try {
          const result = await task();
          resolve(result);
      } catch (error) {
          reject(error);
      } finally {
          this.activeWorkers--;
          this.processQueue();
      }
  }
}

const workerPool = new TranslationWorkerPool();

async function translateText(text, targetLang) {
  // Skip empty or whitespace-only strings
  if (!text || !text.trim()) {
      return text;
  }

  // Check cache first
  const cachedTranslation = cache.get(text, targetLang);
  if (cachedTranslation) {
      return cachedTranslation;
  }

  // If not in cache, create translation task
  const translationTask = async () => {
      try {
          const response = await fetch('https://translate.designtech360.website/translate', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                  text: text,
                  dest: targetLang
              })
          });
          let lastElement = document.getElementById("lastElement");
          // console.log(lastElement.innerText);
          // console.log(text)
          // if(lastElement.innerText == text){
          //   document.getElementById("preloader").style.display = "none";
          // }
          const data = await response.json();
          cache.set(text, targetLang, data.result);
          return data.result;
      } catch (error) {
          console.error('Translation error:', error);
          return text; // Return original text on error
      }
  };

  return workerPool.addTask(translationTask);
}

function shouldTranslateNode(node) {
  // Skip if node is not text node
  if (node.nodeType !== Node.TEXT_NODE) return false;

  // Skip if parent should be ignored
  const parent = node.parentElement;
  if (!parent) return false;

  // Skip script, style, noscript tags and elements with notranslate class
  const ignoredTags = ['SCRIPT', 'STYLE', 'NOSCRIPT'];
  if (ignoredTags.includes(parent.tagName) || 
      parent.classList.contains('notranslate')) {
      return false;
  }

  // Skip if text is empty or only whitespace
  const text = node.textContent.trim();
  return text.length > 0;
}

async function translateTextNode(textNode, lang) {
  const originalText = textNode.textContent.trim();
  if (!originalText) return;

  const translatedText = await translateText(originalText, lang);
  if (translatedText && translatedText !== originalText) {
      // Preserve surrounding whitespace
      const leadingWhitespace = textNode.textContent.match(/^\s*/)[0];
      const trailingWhitespace = textNode.textContent.match(/\s*$/)[0];
      textNode.textContent = leadingWhitespace + translatedText + trailingWhitespace;
  }
}

async function translatePage(lang) {
  if (lang === 'en') return; // Skip translation for English

  // Create a TreeWalker to iterate through text nodes
  const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
          acceptNode: function(node) {
              return shouldTranslateNode(node) ? 
                  NodeFilter.FILTER_ACCEPT : 
                  NodeFilter.FILTER_REJECT;
          }
      }
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
      textNodes.push(node);
  }

  // Translate all valid text nodes
  const translations = textNodes.map(node => translateTextNode(node, lang));
  await Promise.all(translations);
}

// Initialize language selection
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('preferredLanguage');
  if(savedLang == "en"){
    // document.getElementById("preloader").style.display = "none";

    return;
  }
  if (savedLang) {
      translatePage(savedLang);
  } else {
      const modal = new bootstrap.Modal(document.getElementById('languageModal'));
      modal.show();
  }

  // Language selection handlers
  document.querySelectorAll('[data-lang]').forEach(button => {
      button.addEventListener('click', async (e) => {
          const selectedLang = e.target.dataset.lang;
          localStorage.setItem('preferredLanguage', selectedLang);
          
          const modal = bootstrap.Modal.getInstance(document.getElementById('languageModal'));
          modal.hide();

          window.location.reload();
          await translatePage(selectedLang);
      });
  });
});

function changeLanguageModal() {
  const modal = new bootstrap.Modal(document.getElementById('languageModal'));
  modal.show();
}
document.querySelectorAll('[data-lang]').forEach(button => {
  button.addEventListener('click', async (e) => {
      const selectedLang = e.target.dataset.lang;
      localStorage.setItem('preferredLanguage', selectedLang);
      
      const modal = bootstrap.Modal.getInstance(document.getElementById('languageModal'));
      modal.hide();

      window.location.reload();
      await translatePage(selectedLang);
  });
});